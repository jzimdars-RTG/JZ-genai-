import { describe, expect, test } from "@jest/globals";
import { createParseNode } from "../../../src/agent/nodes/parse.js";

describe("parse node", () => {
  test("parses JSON content from LLM", async () => {
    const node = createParseNode({
      llmClient: {
        call: async () => ({ content: "{\"foo\":\"bar\"}" })
      }
    });

    const result = await node({ inputText: "hi", reflection: null });
    expect(result.parseResult).toEqual({ foo: "bar" });
  });
});
