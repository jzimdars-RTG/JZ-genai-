import { GoogleGenAI } from "@google/genai";

/**
 * Vertex AI Gemini provider adapter (using @google/genai SDK).
 */
export class VertexAIProvider {
  /**
   * @param {{ project?: string, location: string, model: string, vertexFactory?: (options: { project: string, location: string }) => any }} options
   */
  constructor({ project, location, model, vertexFactory }) {
    this.project = project;
    this.location = location;
    this.model = model;
    this.vertexFactory = vertexFactory;
  }

  /**
   * @param {{ prompt: string, systemPrompt?: string }} params
   */
  async call({ prompt, systemPrompt }) {
    if (!this.project && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error("VERTEX_AI_PROJECT or GOOGLE_APPLICATION_CREDENTIALS is required for Vertex AI.");
    }

    const start = Date.now();
    const ai = this.vertexFactory
      ? this.vertexFactory({ project: this.project, location: this.location })
      : new GoogleGenAI({
          vertexai: true,
          project: this.project || process.env.VERTEX_AI_PROJECT,
          location: this.location || "us-central1"
        });

    const config = systemPrompt ? { systemInstruction: systemPrompt } : undefined;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
      ...(config ? { config } : {})
    });

    const content = response.text?.trim() ?? "";
    const usage = response.usageMetadata ?? {};

    return {
      content,
      usage: {
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0
      },
      latencyMs: Date.now() - start,
      model: this.model,
      provider: "vertexai"
    };
  }
}
