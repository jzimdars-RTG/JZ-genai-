# Python Agent

A self-contained Python agent that mirrors the `jz-genai-agent-toolkit` JS graph using LangGraph (Python) and Google's Generative AI SDK via `langchain-google-vertexai`.

## What it demonstrates

- **ReAct + self-reflection** — the same `parse → reflect → (retry or retrieve) → decide` loop as the JS toolkit
- **RAG** — in-memory cosine-similarity retrieval over a small ground-transportation knowledge base using Vertex AI `text-embedding-004` (with bag-of-words fallback)
- **LLM-native observability** — logs `input_tokens`, `output_tokens`, `cost_usd`, and `latency_ms` per call to match the JS JSONL trace schema
- **Typed state** — `TypedDict` + type hints throughout

## Graph

```
START → parse → reflect → (conditional: retry → parse | else → retrieve) → decide → END
```

## Requirements

- Python 3.11+
- A `.env` file (copy from the repo root `.env.example`) with either Vertex AI or a Google API key

## Setup

```bash
cd python
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env: set VERTEX_AI_PROJECT and GOOGLE_APPLICATION_CREDENTIALS
python agent.py
```

## Environment variables used

| Variable | Required | Description |
|---|---|---|
| `VERTEX_AI_PROJECT` | Yes (Vertex) | GCP project ID |
| `VERTEX_AI_LOCATION` | No | Defaults to `us-central1` |
| `VERTEX_AI_MODEL` | No | Defaults to `gemini-2.0-flash-001` |
| `VERTEX_AI_EMBEDDING_MODEL` | No | Defaults to `text-embedding-004` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (Vertex) | Service account JSON path |
| `REFLECTION_CONFIDENCE_THRESHOLD` | No | Defaults to `0.7` |
| `MAX_REFLECTION_RETRIES` | No | Defaults to `2` |

## Sample output

```
=== Python ReAct + RAG Agent ===

Input: I need a quote for a limo pickup at DTW for 2 passengers...

[parse] latency=1234ms  input_tokens=148  output_tokens=62  cost_usd=0.000018
[reflect] latency=987ms  input_tokens=193  output_tokens=45  cost_usd=0.000013
[retrieve] top-3 documents retrieved (bag-of-words fallback)
[decide] routing → APPROVE

Final decision: APPROVE
Retrieved context:
  [kb-001] score=0.4312 Airport transfer rates...
  [kb-002] score=0.3891 Limousine vehicles...
  [kb-004] score=0.2741 Flight monitoring...
```
