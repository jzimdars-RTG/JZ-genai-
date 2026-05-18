"""
Python agent implementing ReAct + self-reflection + RAG using LangGraph (Python).

Mirrors the jz-genai-agent-toolkit JS graph:
  START → parse → reflect → (retry or retrieve) → decide → END

Observability: logs input_tokens, output_tokens, cost_usd, latency_ms per call
to match the JS JSONL trace schema.
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from typing import Any, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_vertexai import ChatVertexAI, VertexAIEmbeddings
from langgraph.graph import END, START, StateGraph

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

VERTEX_PROJECT: str = os.getenv("VERTEX_AI_PROJECT", "")
VERTEX_LOCATION: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")
VERTEX_MODEL: str = os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
VERTEX_EMBEDDING_MODEL: str = os.getenv("VERTEX_AI_EMBEDDING_MODEL", "text-embedding-004")
CONFIDENCE_THRESHOLD: float = float(os.getenv("REFLECTION_CONFIDENCE_THRESHOLD", "0.7"))
MAX_RETRIES: int = int(os.getenv("MAX_REFLECTION_RETRIES", "2"))

# Approximate cost per token for gemini-2.0-flash-001 (USD)
_COST_PER_INPUT_TOKEN: float = 0.000_000_075
_COST_PER_OUTPUT_TOKEN: float = 0.000_000_300


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


class RetrievedDoc(TypedDict):
    id: str
    text: str
    score: float


class State(TypedDict):
    input_text: str
    documents: list[dict[str, str]]  # [{ "id": ..., "text": ... }]
    parse_result: dict[str, Any] | None
    reflection: dict[str, Any] | None
    retrieved_context: list[RetrievedDoc]
    decision: str | None
    retry_count: int


# ---------------------------------------------------------------------------
# Observability helpers
# ---------------------------------------------------------------------------


def _log_call(
    operation: str,
    latency_ms: int,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Print a JSONL-compatible trace line matching the JS toolkit schema."""
    cost_usd = (
        input_tokens * _COST_PER_INPUT_TOKEN + output_tokens * _COST_PER_OUTPUT_TOKEN
    )
    entry = {
        "operationName": operation,
        "provider": "vertexai",
        "model": VERTEX_MODEL,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "totalTokens": input_tokens + output_tokens,
        "costUSD": round(cost_usd, 8),
        "latencyMs": latency_ms,
    }
    print(
        f"[{operation}] latency={latency_ms}ms  "
        f"input_tokens={input_tokens}  output_tokens={output_tokens}  "
        f"cost_usd={entry['costUSD']:.6f}"
    )


def _call_llm(
    llm: ChatVertexAI,
    system_prompt: str,
    user_prompt: str,
    operation: str,
) -> str:
    """Call the LLM, log observability, and return the text content."""
    start = time.monotonic()
    response = llm.invoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    )
    latency_ms = int((time.monotonic() - start) * 1000)

    usage = getattr(response, "usage_metadata", None) or {}
    input_tokens: int = usage.get("input_tokens", 0) if isinstance(usage, dict) else getattr(usage, "input_tokens", 0)
    output_tokens: int = usage.get("output_tokens", 0) if isinstance(usage, dict) else getattr(usage, "output_tokens", 0)

    _log_call(operation, latency_ms, input_tokens, output_tokens)
    return str(response.content).strip()


# ---------------------------------------------------------------------------
# Cosine similarity utilities
# ---------------------------------------------------------------------------


def _bow_freq(text: str) -> dict[str, float]:
    """Bag-of-words frequency map."""
    freq: dict[str, float] = {}
    for word in re.findall(r"\w+", text.lower()):
        freq[word] = freq.get(word, 0.0) + 1.0
    return freq


def _bow_cosine(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity between two bag-of-words maps."""
    dot = sum(a.get(w, 0.0) * v for w, v in b.items())
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    denom = mag_a * mag_b
    return dot / denom if denom else 0.0


def _vec_cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two float vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    denom = mag_a * mag_b
    return dot / denom if denom else 0.0


# ---------------------------------------------------------------------------
# In-memory knowledge base (ground-transportation domain)
# ---------------------------------------------------------------------------

KNOWLEDGE_BASE: list[dict[str, str]] = [
    {
        "id": "kb-001",
        "text": (
            "Airport transfer rates are calculated based on distance from the pickup "
            "address to the terminal. Standard rates begin at $75 for trips under 20 "
            "miles and increase by $2.50 per additional mile."
        ),
    },
    {
        "id": "kb-002",
        "text": (
            "Limousine vehicles available for charter include the Lincoln Town Car "
            "(up to 3 passengers), the Mercedes Sprinter van (up to 14 passengers), "
            "and the stretch limousine (up to 8 passengers)."
        ),
    },
    {
        "id": "kb-003",
        "text": (
            "Meet-and-greet service includes a driver waiting at baggage claim with a "
            "name sign, assistance with luggage, and complimentary bottled water. "
            "This add-on costs $25 per trip."
        ),
    },
    {
        "id": "kb-004",
        "text": (
            "Flight monitoring is included at no extra charge for all airport pickups. "
            "If a flight is delayed, the driver will adjust arrival time automatically "
            "using real-time flight tracking."
        ),
    },
    {
        "id": "kb-005",
        "text": (
            "Cancellation policy: reservations cancelled more than 24 hours before "
            "pickup receive a full refund. Cancellations within 24 hours are charged "
            "50% of the base fare. No-shows are billed at the full rate."
        ),
    },
    {
        "id": "kb-006",
        "text": (
            "Dispatch operations run 24 hours a day, 7 days a week. Drivers are "
            "assigned automatically by the dispatch system based on proximity, vehicle "
            "type requested, and shift availability."
        ),
    },
    {
        "id": "kb-007",
        "text": (
            "Corporate accounts receive a 10% discount on all bookings over $150. "
            "Accounts must be pre-approved with a valid business tax ID and billing "
            "address on file."
        ),
    },
    {
        "id": "kb-008",
        "text": (
            "Gratuity is not included in the quoted fare. Industry standard gratuity "
            "is 15–20% of the base fare. Drivers may also be tipped in cash at the "
            "time of service."
        ),
    },
]


# ---------------------------------------------------------------------------
# Node: parse
# ---------------------------------------------------------------------------


def build_parse_node(llm: ChatVertexAI):
    """Returns a LangGraph node that extracts structured data from input_text."""

    def parse(state: State) -> dict[str, Any]:
        prior_feedback = ""
        if state.get("reflection") and state["reflection"].get("needs_retry"):
            prior_feedback = (
                f"\nPrior reflection feedback: {state['reflection']['feedback']}"
            )

        prompt = (
            f"Extract structured fields from this transportation request and return "
            f"JSON only:\n\n{state['input_text']}{prior_feedback}"
        )

        text = _call_llm(
            llm,
            system_prompt="You are a strict extractor. Output JSON only.",
            user_prompt=prompt,
            operation="agent.parse",
        )

        # Strip markdown code fences if present
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
        try:
            parse_result = json.loads(cleaned)
        except json.JSONDecodeError:
            parse_result = {"raw": text}

        return {"parse_result": parse_result}

    return parse


# ---------------------------------------------------------------------------
# Node: reflect
# ---------------------------------------------------------------------------


def build_reflect_node(llm: ChatVertexAI):
    """Returns a LangGraph node that scores parse quality and sets needs_retry."""

    def reflect(state: State) -> dict[str, Any]:
        prompt = (
            'Review this parsed output for quality and correctness. '
            'Return JSON {"confidence": number, "feedback": string, "needs_retry": boolean}.\n\n'
            f"Parsed output:\n{json.dumps(state['parse_result'])}"
        )

        text = _call_llm(
            llm,
            system_prompt="You are a strict reviewer. Return JSON only.",
            user_prompt=prompt,
            operation="agent.reflect",
        )

        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
        try:
            data = json.loads(cleaned)
            confidence = float(data.get("confidence", 0.0))
            feedback = str(data.get("feedback", "No feedback."))
            needs_retry = bool(data.get("needs_retry", False))
        except (json.JSONDecodeError, ValueError):
            confidence = 0.0
            feedback = "Reflection response was not JSON."
            needs_retry = True

        below_threshold = confidence < CONFIDENCE_THRESHOLD
        can_retry = state["retry_count"] < MAX_RETRIES
        should_retry = needs_retry or (below_threshold and can_retry)

        return {
            "reflection": {
                "confidence": confidence,
                "feedback": feedback,
                "needs_retry": should_retry,
            },
            "retry_count": state["retry_count"] + 1 if should_retry else state["retry_count"],
        }

    return reflect


# ---------------------------------------------------------------------------
# Node: retrieve
# ---------------------------------------------------------------------------


def build_retrieve_node(embeddings_client: VertexAIEmbeddings | None, top_k: int = 3):
    """
    Returns a LangGraph node that ranks documents by similarity to input_text.

    Uses Vertex AI embeddings when available; falls back to bag-of-words cosine
    similarity when the embeddings client is None or a call fails.
    """

    def retrieve(state: State) -> dict[str, Any]:
        documents: list[dict[str, str]] = state.get("documents") or []
        if not documents:
            print("[retrieve] no documents — skipping")
            return {"retrieved_context": []}

        # Attempt real embeddings, fall back to BoW
        use_embeddings = False
        query_vec: list[float] = []
        doc_vecs: list[list[float]] = []

        if embeddings_client is not None:
            try:
                start = time.monotonic()
                all_texts = [state["input_text"]] + [d["text"] for d in documents]
                all_vecs = embeddings_client.embed_documents(all_texts)
                query_vec = all_vecs[0]
                doc_vecs = all_vecs[1:]
                latency_ms = int((time.monotonic() - start) * 1000)
                print(
                    f"[retrieve] Vertex AI embeddings latency={latency_ms}ms  "
                    f"docs={len(documents)}"
                )
                use_embeddings = True
            except Exception as exc:  # noqa: BLE001
                print(f"[retrieve] embedding failed ({exc}); using bag-of-words fallback")

        scored: list[RetrievedDoc] = []
        if use_embeddings:
            for doc, vec in zip(documents, doc_vecs):
                score = _vec_cosine(query_vec, vec)
                scored.append(RetrievedDoc(id=doc["id"], text=doc["text"], score=score))
        else:
            query_bow = _bow_freq(state["input_text"])
            for doc in documents:
                score = _bow_cosine(query_bow, _bow_freq(doc["text"]))
                scored.append(RetrievedDoc(id=doc["id"], text=doc["text"], score=score))
            print(f"[retrieve] bag-of-words fallback  docs={len(documents)}")

        top_docs = sorted(scored, key=lambda d: d["score"], reverse=True)[:top_k]
        print(f"[retrieve] top-{top_k} documents retrieved")
        return {"retrieved_context": top_docs}

    return retrieve


# ---------------------------------------------------------------------------
# Node: decide
# ---------------------------------------------------------------------------


def decide(state: State) -> dict[str, Any]:
    """Simple decision node that approves when parse_result is present."""
    if state.get("parse_result"):
        decision = "APPROVE"
        reason = "Parse and retrieval completed successfully."
    else:
        decision = "REJECT"
        reason = "Missing parse result."
    print(f"[decide] routing → {decision}  reason: {reason}")
    return {"decision": decision}


# ---------------------------------------------------------------------------
# Conditional routing after reflect
# ---------------------------------------------------------------------------


def route_after_reflect(state: State) -> str:
    """Return 'parse' for a retry or 'retrieve' to continue."""
    reflection = state.get("reflection") or {}
    if reflection.get("needs_retry") and state["retry_count"] <= MAX_RETRIES:
        return "parse"
    return "retrieve"


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------


def build_graph(
    llm: ChatVertexAI,
    embeddings_client: VertexAIEmbeddings | None,
    top_k: int = 3,
) -> Any:
    """Compiles and returns the LangGraph StateGraph."""
    builder: StateGraph = StateGraph(State)

    builder.add_node("parse", build_parse_node(llm))
    builder.add_node("reflect", build_reflect_node(llm))
    builder.add_node("retrieve", build_retrieve_node(embeddings_client, top_k))
    builder.add_node("decide", decide)

    builder.add_edge(START, "parse")
    builder.add_edge("parse", "reflect")
    builder.add_conditional_edges(
        "reflect",
        route_after_reflect,
        {"parse": "parse", "retrieve": "retrieve"},
    )
    builder.add_edge("retrieve", "decide")
    builder.add_edge("decide", END)

    return builder.compile()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    print("=== Python ReAct + RAG Agent ===\n")

    # Build LLM client (ChatVertexAI falls back gracefully when credentials are absent)
    llm = ChatVertexAI(
        model=VERTEX_MODEL,
        project=VERTEX_PROJECT or None,
        location=VERTEX_LOCATION,
        temperature=0,
    )

    # Build embeddings client — set to None if project is not configured
    embeddings_client: VertexAIEmbeddings | None = None
    if VERTEX_PROJECT:
        try:
            embeddings_client = VertexAIEmbeddings(
                model_name=VERTEX_EMBEDDING_MODEL,
                project=VERTEX_PROJECT,
                location=VERTEX_LOCATION,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Embeddings client init failed ({exc}); will use BoW fallback.\n")

    graph = build_graph(llm, embeddings_client)

    sample_input = (
        "I need a quote for a limousine airport pickup at DTW for 2 passengers. "
        "My flight is Delta 1204 arriving at 8:30 PM. "
        "Do you monitor flights? What is the cancellation policy?"
    )

    print(f"Input: {sample_input}\n")

    initial_state: State = {
        "input_text": sample_input,
        "documents": KNOWLEDGE_BASE,
        "parse_result": None,
        "reflection": None,
        "retrieved_context": [],
        "decision": None,
        "retry_count": 0,
    }

    result: State = graph.invoke(initial_state)

    print("\n--- Retrieved Context ---")
    for doc in result.get("retrieved_context", []):
        print(f"  [{doc['id']}] score={doc['score']:.4f}  {doc['text'][:80]}...")

    print("\n--- Parse Result ---")
    print(json.dumps(result.get("parse_result"), indent=2))

    print(f"\nFinal decision: {result.get('decision')}")
    print(f"Retry count: {result.get('retry_count')}")
    print(f"Reflection confidence: {result.get('reflection', {}).get('confidence', 'n/a')}")
