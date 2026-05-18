import { describe, expect, test } from "@jest/globals";
import { createRetrieveNode } from "../../../src/agent/nodes/retrieve.js";

describe("retrieve node", () => {
  test("returns empty retrievedContext when documents is empty", async () => {
    const node = createRetrieveNode({
      llmClient: { embed: async () => [] }
    });

    const result = await node({ inputText: "DTW airport transfer", documents: [] });
    expect(result.retrievedContext).toEqual([]);
  });

  test("ranks documents by real embedding cosine similarity", async () => {
    // Simulate two distinct embedding vectors so we can verify ranking.
    // doc1 is very similar to the query; doc2 is orthogonal.
    const embeddings = {
      "query text": [1, 0, 0],
      "doc1 matches query": [0.99, 0.14, 0],
      "doc2 unrelated": [0, 1, 0]
    };

    const node = createRetrieveNode({
      llmClient: {
        embed: async ({ text }) => embeddings[text] ?? [0, 0, 0]
      },
      topK: 2
    });

    const result = await node({
      inputText: "query text",
      documents: [
        { id: "d1", text: "doc1 matches query" },
        { id: "d2", text: "doc2 unrelated" }
      ]
    });

    expect(result.retrievedContext).toHaveLength(2);
    expect(result.retrievedContext[0].id).toBe("d1");
    expect(result.retrievedContext[0].score).toBeGreaterThan(result.retrievedContext[1].score);
  });

  test("falls back to bag-of-words similarity when embed returns empty array", async () => {
    const node = createRetrieveNode({
      llmClient: { embed: async () => [] },
      topK: 1
    });

    const result = await node({
      inputText: "limousine airport transfer",
      documents: [
        { id: "limo", text: "limousine service for airport transfers" },
        { id: "food", text: "restaurant menu and catering options" }
      ]
    });

    expect(result.retrievedContext).toHaveLength(1);
    expect(result.retrievedContext[0].id).toBe("limo");
  });

  test("respects topK parameter", async () => {
    const node = createRetrieveNode({
      llmClient: { embed: async () => [] },
      topK: 2
    });

    const result = await node({
      inputText: "transportation",
      documents: [
        { id: "d1", text: "car transportation service" },
        { id: "d2", text: "bus transportation route" },
        { id: "d3", text: "train transportation network" },
        { id: "d4", text: "something completely unrelated" }
      ]
    });

    expect(result.retrievedContext).toHaveLength(2);
  });

  test("includes score in each retrieved document", async () => {
    const node = createRetrieveNode({
      llmClient: { embed: async () => [] }
    });

    const result = await node({
      inputText: "airport pickup",
      documents: [{ id: "a1", text: "airport limousine pickup and dropoff" }]
    });

    expect(result.retrievedContext[0]).toHaveProperty("score");
    expect(typeof result.retrievedContext[0].score).toBe("number");
  });
});
