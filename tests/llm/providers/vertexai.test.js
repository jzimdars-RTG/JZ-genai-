import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { VertexAIProvider } from "../../../src/llm/providers/vertexai.js";

describe("VertexAIProvider", () => {
  const originalCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const originalVertexProject = process.env.VERTEX_AI_PROJECT;

  beforeEach(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "mock-credentials";
  });

  afterEach(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = originalCredentials;
    process.env.VERTEX_AI_PROJECT = originalVertexProject;
  });

  test("maps generateContent response and includes system instruction config", async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: "  hello world  ",
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 4,
        totalTokenCount: 14
      }
    });
    const vertexFactory = jest.fn().mockReturnValue({
      models: { generateContent }
    });
    const provider = new VertexAIProvider({
      project: "project-id",
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory
    });

    const result = await provider.call({ prompt: "Say hi", systemPrompt: "Be concise" });

    expect(vertexFactory).toHaveBeenCalledWith({ project: "project-id", location: "us-central1" });
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.0-flash-001",
      contents: "Say hi",
      config: { systemInstruction: "Be concise" }
    });
    expect(result).toMatchObject({
      content: "hello world",
      usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
      model: "gemini-2.0-flash-001",
      provider: "vertexai"
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  test("omits config when no system prompt is supplied", async () => {
    const generateContent = jest.fn().mockResolvedValue({ text: "ok", usageMetadata: {} });
    const provider = new VertexAIProvider({
      project: "project-id",
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory: () => ({ models: { generateContent } })
    });

    await provider.call({ prompt: "Hello" });

    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.0-flash-001",
      contents: "Hello"
    });
  });

  test("defaults content to empty string when response text is missing", async () => {
    const provider = new VertexAIProvider({
      project: "project-id",
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory: () => ({ models: { generateContent: jest.fn().mockResolvedValue({ usageMetadata: {} }) } })
    });

    const result = await provider.call({ prompt: "Hello" });

    expect(result.content).toBe("");
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  test("requires project or GOOGLE_APPLICATION_CREDENTIALS", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
    process.env.VERTEX_AI_PROJECT = "";
    const provider = new VertexAIProvider({
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory: () => ({ models: { generateContent: jest.fn() } })
    });

    await expect(provider.call({ prompt: "Hello" })).rejects.toThrow(
      "VERTEX_AI_PROJECT or GOOGLE_APPLICATION_CREDENTIALS is required for Vertex AI."
    );
  });

  test("allows VERTEX_AI_PROJECT from environment when project is not supplied", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
    process.env.VERTEX_AI_PROJECT = "env-project-id";
    const generateContent = jest.fn().mockResolvedValue({ text: "ok", usageMetadata: {} });
    const provider = new VertexAIProvider({
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory: () => ({ models: { generateContent } })
    });

    await expect(provider.call({ prompt: "Hello" })).resolves.toMatchObject({ content: "ok" });
  });

  test("propagates SDK errors", async () => {
    const provider = new VertexAIProvider({
      project: "project-id",
      location: "us-central1",
      model: "gemini-2.0-flash-001",
      vertexFactory: () => ({
        models: {
          generateContent: jest.fn().mockRejectedValue(new Error("upstream failure"))
        }
      })
    });

    await expect(provider.call({ prompt: "Hello" })).rejects.toThrow("upstream failure");
  });

});
