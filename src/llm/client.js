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
}
