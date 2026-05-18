/**
 * Provider router with primary/fallback behavior.
 */
export class ProviderRouter {
  /**
   * @param {{ providers: Record<string, { call: (params: { prompt: string, systemPrompt?: string }) => Promise<any> }>, primary: string, fallback: string, enableFallback: boolean }} options
   */
  constructor({ providers, primary, fallback, enableFallback }) {
    this.providers = providers;
    this.primary = primary;
    this.fallback = fallback;
    this.enableFallback = enableFallback;
  }

  /**
   * @param {{ prompt: string, systemPrompt?: string }} params
   */
  async callWithFallback(params) {
    const primaryProvider = this.providers[this.primary];
    if (!primaryProvider) {
      throw new Error(`Primary provider '${this.primary}' is not configured.`);
    }

    try {
      return await primaryProvider.call(params);
    } catch (primaryError) {
      if (!this.enableFallback || this.primary === this.fallback) {
        throw primaryError;
      }

      const fallbackProvider = this.providers[this.fallback];
      if (!fallbackProvider) {
        throw primaryError;
      }

      return fallbackProvider.call(params);
    }
  }
}
