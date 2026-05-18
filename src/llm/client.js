/**
 * Unified provider-agnostic LLM client.
 */
export class LLMClient {
  /**
   * @param {{ router: { callWithFallback: (params: { prompt: string, systemPrompt?: string }) => Promise<any> }, tracer: { traceLLMCall: (params: { operationName: string, call: () => Promise<any> }) => Promise<any> } }} options
   */
  constructor({ router, tracer }) {
    this.router = router;
    this.tracer = tracer;
  }

  /**
   * Executes a model call through provider routing and tracing.
   *
   * @param {{ prompt: string, systemPrompt?: string, operationName: string }} params
   */
  async call({ prompt, systemPrompt, operationName }) {
    return this.tracer.traceLLMCall({
      operationName,
      call: () => this.router.callWithFallback({ prompt, systemPrompt })
    });
  }

  /**
   * Embeds text using Vertex AI `text-embedding-004` via `@google/genai`.
   * Returns an empty array (triggering bag-of-words fallback in the retrieve node)
   * when credentials are missing or the call fails.
   *
   * @param {{ text: string }} params
   * @returns {Promise<number[]>}
   */
  async embed({ text }) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const project = process.env.VERTEX_AI_PROJECT;
      const location = process.env.VERTEX_AI_LOCATION ?? "us-central1";
      if (!project) return [];
      const ai = new GoogleGenAI({ vertexai: true, project, location });
      const model = process.env.VERTEX_AI_EMBEDDING_MODEL ?? "text-embedding-004";
      const response = await ai.models.embedContent({ model, contents: text });
      const values = response.embeddings?.[0]?.values;
      return Array.isArray(values) && values.length > 0 ? values : [];
    } catch {
      return [];
    }
  }
}
