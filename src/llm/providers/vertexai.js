import { VertexAI } from "@google-cloud/vertexai";

/**
 * Vertex AI Gemini provider adapter.
 */
export class VertexAIProvider {
  /**
   * @param {{ project?: string, location: string, model: string, vertexFactory?: (options: { project: string, location: string }) => { getGenerativeModel: (opts: { model: string }) => { generateContent: (request: unknown) => Promise<{ response: any }> } } }} options
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
    const factory =
      this.vertexFactory ??
      ((options) => {
        const client = new VertexAI(options);
        return client;
      });

    const client = factory({ project: this.project || "", location: this.location });
    const model = client.getGenerativeModel({ model: this.model });

    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(systemPrompt ? { systemInstruction: { role: "system", parts: [{ text: systemPrompt }] } } : {})
    };

    const response = await model.generateContent(request);
    const usage = response.response?.usageMetadata ?? {};
    const contentParts = response.response?.candidates?.[0]?.content?.parts ?? [];
    const content = contentParts.map((part) => part.text || "").join("").trim();

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
