import { describe, expect, jest, test } from "@jest/globals";
import { AzureKeyCredential } from "@azure/core-auth";
import { AzureAIProvider } from "../../../src/llm/providers/azureai.js";

const makeClient = (status, body) => ({
  path: () => ({
    post: jest.fn().mockResolvedValue({ status, body })
  })
});

describe("AzureAIProvider", () => {
  // ---------------------------------------------------------------------------
  // API key path
  // ---------------------------------------------------------------------------
  test("calls endpoint with AzureKeyCredential when apiKey is provided", async () => {
    const clientFactory = jest.fn().mockReturnValue(
      makeClient("200", {
        choices: [{ message: { content: "hello" } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 }
      })
    );

    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "my-secret-key",
      model: "my-model",
      clientFactory
    });

    const result = await provider.call({ prompt: "hi", systemPrompt: "be helpful" });

    expect(clientFactory).toHaveBeenCalledTimes(1);
    const [calledEndpoint, calledCredential] = clientFactory.mock.calls[0];
    expect(calledEndpoint).toBe("https://example.azure.com");
    expect(calledCredential).toBeInstanceOf(AzureKeyCredential);

    expect(result).toMatchObject({
      content: "hello",
      usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 },
      model: "my-model",
      provider: "azureai"
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  test("omits system message when no systemPrompt is supplied", async () => {
    const post = jest.fn().mockResolvedValue({
      status: "200",
      body: { choices: [{ message: { content: "ok" } }], usage: {} }
    });
    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "key",
      model: "model",
      clientFactory: () => ({ path: () => ({ post }) })
    });

    await provider.call({ prompt: "Hello" });

    const body = post.mock.calls[0][0].body;
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  test("defaults content and usage to zero/empty when fields are missing", async () => {
    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "key",
      model: "model",
      clientFactory: () => makeClient("200", { choices: [], usage: {} })
    });

    const result = await provider.call({ prompt: "Hello" });

    expect(result.content).toBe("");
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  // ---------------------------------------------------------------------------
  // Azure AD credential path
  // ---------------------------------------------------------------------------
  test("passes TokenCredential directly to client when credential is provided (no apiKey)", async () => {
    const mockCredential = { getToken: jest.fn().mockResolvedValue({ token: "tok", expiresOnTimestamp: 9999 }) };
    const clientFactory = jest.fn().mockReturnValue(
      makeClient("200", {
        choices: [{ message: { content: "ad-response" } }],
        usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 }
      })
    );

    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      model: "my-model",
      credential: mockCredential,
      clientFactory
    });

    const result = await provider.call({ prompt: "managed identity call" });

    const [calledEndpoint, calledCredential] = clientFactory.mock.calls[0];
    expect(calledEndpoint).toBe("https://example.azure.com");
    // Should receive the credential object directly — NOT wrapped in AzureKeyCredential
    expect(calledCredential).toBe(mockCredential);
    expect(calledCredential).not.toBeInstanceOf(AzureKeyCredential);

    expect(result).toMatchObject({
      content: "ad-response",
      usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 },
      model: "my-model",
      provider: "azureai"
    });
  });

  test("prefers AzureKeyCredential over TokenCredential when both are supplied", async () => {
    const mockCredential = { getToken: jest.fn() };
    const clientFactory = jest.fn().mockReturnValue(
      makeClient("200", { choices: [{ message: { content: "" } }], usage: {} })
    );

    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "explicit-key",
      model: "model",
      credential: mockCredential,
      clientFactory
    });

    await provider.call({ prompt: "test" });

    const [, calledCredential] = clientFactory.mock.calls[0];
    expect(calledCredential).toBeInstanceOf(AzureKeyCredential);
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  test("throws when endpoint is missing", async () => {
    const provider = new AzureAIProvider({ apiKey: "key", model: "model" });
    await expect(provider.call({ prompt: "hi" })).rejects.toThrow(
      "AZURE_AI_ENDPOINT and either AZURE_AI_KEY or a TokenCredential are required for Azure AI Inference."
    );
  });

  test("throws when neither apiKey nor credential is provided", async () => {
    const provider = new AzureAIProvider({ endpoint: "https://example.azure.com", model: "model" });
    await expect(provider.call({ prompt: "hi" })).rejects.toThrow(
      "AZURE_AI_ENDPOINT and either AZURE_AI_KEY or a TokenCredential are required for Azure AI Inference."
    );
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  test("includes response body in error message on non-200 status", async () => {
    const errorBody = { error: { code: "InvalidRequest", message: "bad param" } };
    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "key",
      model: "model",
      clientFactory: () => makeClient("400", errorBody)
    });

    await expect(provider.call({ prompt: "hi" })).rejects.toThrow(
      `Azure AI call failed with status 400: ${JSON.stringify(errorBody)}`
    );
  });

  test("propagates SDK errors", async () => {
    const provider = new AzureAIProvider({
      endpoint: "https://example.azure.com",
      apiKey: "key",
      model: "model",
      clientFactory: () => ({
        path: () => ({ post: jest.fn().mockRejectedValue(new Error("network failure")) })
      })
    });

    await expect(provider.call({ prompt: "hi" })).rejects.toThrow("network failure");
  });
});
