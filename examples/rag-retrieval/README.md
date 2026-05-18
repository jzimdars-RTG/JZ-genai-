# RAG Retrieval Example

Demonstrates the **retrieve** node in the `jz-genai-agent-toolkit` agent graph.

## What it does

The retrieve node runs between `reflect` and `enrich` in the graph. It:

1. Takes a `documents` array (in-memory knowledge base of `{ id, text }` objects) from agent state.
2. Embeds the `inputText` and each document using `LLMClient.embed()`, which calls Vertex AI's `text-embedding-004` model. When credentials are unavailable, it falls back to bag-of-words cosine similarity automatically.
3. Ranks documents by cosine similarity to the query and stores the top-K results as `retrievedContext` on state.
4. The `enrich`, `decide`, and downstream nodes have access to `retrievedContext` to ground their outputs.

The example loads a small hardcoded knowledge base of ground-transportation facts (pricing, vehicle types, cancellation policy, dispatch operations) and runs a full agent pass with a customer inquiry.

## Graph flow

```
START → parse → reflect → retrieve → enrich → decide → humanApproval → END
```

## How to run

```bash
# From the repo root:
cp .env.example .env
# Fill in VERTEX_AI_PROJECT and GOOGLE_APPLICATION_CREDENTIALS (or AZURE_AI_KEY)

npm run example:rag
```

Without valid Vertex AI credentials the retrieve node falls back to bag-of-words similarity automatically — the example will still run and print ranked results.

## Sample output

```
=== RAG Retrieval Example ===

Input: I need a quote for a limousine airport pickup at DTW for 3 passengers...

--- Retrieved Context ---
[kb-001] score=0.4231
  Airport transfer rates are calculated based on distance...

[kb-002] score=0.3814
  Limousine vehicles available for charter include...

[kb-005] score=0.2967
  Cancellation policy: reservations cancelled more than 24 hours...

--- Final State ---
{ ... }
```
