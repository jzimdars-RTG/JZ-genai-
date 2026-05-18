import { buildAgentGraph } from "./agent/graph.js";
import { createInitialState } from "./agent/state.js";
import { LLMClient } from "./llm/client.js";
import { AzureAIProvider } from "./llm/providers/azureai.js";
import { VertexAIProvider } from "./llm/providers/vertexai.js";
import { ProviderRouter } from "./llm/router.js";
import { Tracer } from "./observability/tracer.js";
import { printTracingSummary } from "./observability/summary.js";
import { loadConfig } from "./utils/config.js";

/**
 * Creates a production-ready agent instance.
 *
 * @param {{ config?: ReturnType<typeof loadConfig>, providers?: Record<string, { call: (params: { prompt: string, systemPrompt?: string }) => Promise<any> }> }} [options]
 */
export function createAgent(options = {}) {
  const config = options.config ?? loadConfig();

  const providers = options.providers ?? {
    vertexai: new VertexAIProvider({
      project: config.vertexProject,
      location: config.vertexLocation,
      model: config.vertexModel
    }),
    azureai: new AzureAIProvider({
      endpoint: config.azureEndpoint,
      apiKey: config.azureKey,
      model: config.azureModel
    })
  };

  const tracer = new Tracer({ traceDir: config.traceDir });

  const router = new ProviderRouter({
    providers,
    primary: config.llmPrimaryProvider,
    fallback: config.llmFallbackProvider,
    enableFallback: config.enableFallback
  });

  const llmClient = new LLMClient({ router, tracer });

  const graph = buildAgentGraph({
    llmClient,
    reflectionConfidenceThreshold: config.reflectionConfidenceThreshold,
    maxReflectionRetries: config.maxReflectionRetries,
    humanApprovalMode: config.humanApprovalMode
  });

  return {
    /**
     * Runs the full agent graph.
     *
     * @param {{ inputText: string, documents?: Array<{ id: string, text: string }> }} params
     */
    async run({ inputText, documents = [] }) {
      const initialState = createInitialState(inputText, documents);
      const result = await graph.invoke(initialState);
      return {
        state: result,
        tracing: tracer.getSummary()
      };
    },
    /**
     * Prints a tracing summary table.
     */
    printSummary() {
      printTracingSummary(tracer.getSummary());
    },
    tracer,
    llmClient
  };
}
