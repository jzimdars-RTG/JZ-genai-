import { describe, expect, test } from "@jest/globals";
import { buildAgentGraph } from "../../src/agent/graph.js";

describe("agent graph", () => {
  test("runs end-to-end with reflection retry", async () => {
    const responses = [
      { content: "{\"intent\":\"quote\"}" },
      { content: "{\"confidence\":0.1,\"feedback\":\"retry\",\"needsRetry\":true}" },
      { content: "{\"intent\":\"quote\",\"passengers\":2}" },
      { content: "{\"confidence\":0.95,\"feedback\":\"ok\",\"needsRetry\":false}" }
    ];

    const llmClient = {
      call: async () => {
        const next = responses.shift();
        if (!next) {
          throw new Error("No more mocked responses.");
        }
        return next;
      }
    };

    const graph = buildAgentGraph({
      llmClient,
      reflectionConfidenceThreshold: 0.7,
      maxReflectionRetries: 2,
      humanApprovalMode: "auto"
    });

    const result = await graph.invoke({
      inputText: "please quote",
      parseResult: null,
      reflection: null,
      enrichments: null,
      decision: null,
      humanApproved: false,
      retryCount: 0,
      done: false
    });

    expect(result.humanApproved).toBe(true);
    expect(result.done).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(result.parseResult.passengers).toBe(2);
  });
});
