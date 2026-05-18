import { describe, expect, test } from "@jest/globals";
import { LLMClient } from "../../src/llm/client.js";

describe("LLMClient", () => {
  test("calls router through tracer", async () => {
    const tracerCalls = [];
    const client = new LLMClient({
      router: {
        callWithFallback: async () => ({
          content: "ok",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          latencyMs: 10,
          model: "m",
          provider: "p"
        })
      },
      tracer: {
        traceLLMCall: async ({ operationName, call }) => {
          tracerCalls.push(operationName);
          return call();
        }
      }
    });

    const result = await client.call({ operationName: "op", prompt: "hello" });

    expect(result.content).toBe("ok");
    expect(tracerCalls).toEqual(["op"]);
  });
});
