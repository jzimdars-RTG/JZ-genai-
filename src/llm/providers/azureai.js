import createClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

/**
 * Azure AI Inference Kimi provider adapter.
 */
export class AzureAIProvider {
  /**
   * @param {{ endpoint?: string, apiKey?: string, model: string, credential?: import("@azure/core-auth").TokenCredential, clientFactory?: (endpoint: string, credential: AzureKeyCredential | import("@azure/core-auth").TokenCredential) => any }} options
   * @param {string} [options.endpoint] - Azure AI Inference endpoint URL
   * @param {string} [options.apiKey] - Azure AI Inference API key (used with AzureKeyCredential). Either apiKey or credential must be provided.
   * @param {string} options.model - Model deployment name
   * @param {import("@azure/core-auth").TokenCredential} [options.credential] - Azure AD TokenCredential (e.g. DefaultAzureCredential). Used when no apiKey is provided.
   * @param {Function} [options.clientFactory] - Optional factory for creating the REST client (used in tests)
   */
  constructor({ endpoint, apiKey, model, credential, clientFactory }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
    this.credential = credential;
    this.clientFactory = clientFactory;
  }

  /**
   * @param {{ prompt: string, systemPrompt?: string }} params
   */
  async call({ prompt, systemPrompt }) {
    if (!this.endpoint || (!this.apiKey && !this.credential)) {
      throw new Error("AZURE_AI_ENDPOINT and either AZURE_AI_KEY or a TokenCredential are required for Azure AI Inference.");
    }

    const start = Date.now();
    const resolvedCredential = this.apiKey ? new AzureKeyCredential(this.apiKey) : this.credential;
    const factory = this.clientFactory ?? ((endpoint, credential) => createClient(endpoint, credential));
    const client = factory(this.endpoint, resolvedCredential);

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
      throw new Error(`Azure AI call failed with status ${response.status}: ${JSON.stringify(response.body)}`);
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
