import createClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

/**
 * Azure AI Inference Kimi provider adapter.
 */
export class AzureAIProvider {
  /**
   * @param {{ endpoint?: string, apiKey?: string, model: string, clientFactory?: (endpoint: string, credential: AzureKeyCredential) => any }} options
   */
  constructor({ endpoint, apiKey, model, clientFactory }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
    this.clientFactory = clientFactory;
  }

  /**
   * @param {{ prompt: string, systemPrompt?: string }} params
   */
  async call({ prompt, systemPrompt }) {
    if (!this.endpoint || !this.apiKey) {
      throw new Error("AZURE_AI_ENDPOINT and AZURE_AI_KEY are required for Azure AI Inference.");
    }

    const start = Date.now();
    const factory = this.clientFactory ?? ((endpoint, credential) => createClient(endpoint, credential));
    const client = factory(this.endpoint, new AzureKeyCredential(this.apiKey));

    const response = await client.path("/chat/completions").post({
      body: {
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ]
      }
    });

    if (response.status !== "200") {
      throw new Error(`Azure AI call failed with status ${response.status}`);
    }

    const body = response.body;
    const content = body?.choices?.[0]?.message?.content ?? "";
    const usage = body?.usage ?? {};

    return {
      content,
      usage: {
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0
      },
      latencyMs: Date.now() - start,
      model: this.model,
      provider: "azureai"
    };
  }
}
