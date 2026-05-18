import { describe, expect, test } from "@jest/globals";
import { createReflectNode } from "../../../src/agent/nodes/reflect.js";

describe("reflect node", () => {
  test("flags retry for low confidence", async () => {
    const node = createReflectNode({
      llmClient: {
        call: async () => ({ content: "{\"confidence\":0.2,\"feedback\":\"retry\",\"needsRetry\":false}" })
      },
      confidenceThreshold: 0.7,
      maxRetries: 2
    });

    const result = await node({ parseResult: { a: 1 }, retryCount: 0 });
    expect(result.reflection.needsRetry).toBe(true);
    expect(result.retryCount).toBe(1);
  });
});
