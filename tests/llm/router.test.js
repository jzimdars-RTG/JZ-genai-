import { describe, expect, test } from "@jest/globals";
import { ProviderRouter } from "../../src/llm/router.js";

describe("ProviderRouter", () => {
  test("routes to primary provider when successful", async () => {
    const router = new ProviderRouter({
      providers: {
        vertexai: { call: async () => ({ provider: "vertexai" }) },
        azureai: { call: async () => ({ provider: "azureai" }) }
      },
      primary: "vertexai",
      fallback: "azureai",
      enableFallback: true
    });

    const result = await router.callWithFallback({ prompt: "hello" });
    expect(result.provider).toBe("vertexai");
  });

  test("uses fallback provider when primary fails", async () => {
    const router = new ProviderRouter({
      providers: {
        vertexai: { call: async () => Promise.reject(new Error("primary down")) },
        azureai: { call: async () => ({ provider: "azureai" }) }
      },
      primary: "vertexai",
      fallback: "azureai",
      enableFallback: true
    });

    const result = await router.callWithFallback({ prompt: "hello" });
    expect(result.provider).toBe("azureai");
  });
});
