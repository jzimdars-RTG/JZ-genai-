import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createDecideNode } from "./nodes/decide.js";
import { createEnrichNode } from "./nodes/enrich.js";
import { createHumanApprovalNode } from "./nodes/humanApproval.js";
import { createParseNode } from "./nodes/parse.js";
import { createReflectNode } from "./nodes/reflect.js";
import { createRetrieveNode } from "./nodes/retrieve.js";

const AgentStateAnnotation = Annotation.Root({
  inputText: Annotation({
    reducer: (_, update) => update,
    default: () => ""
  }),
  documents: Annotation({
    reducer: (_, update) => update,
    default: () => []
  }),
  parseResult: Annotation({
    reducer: (_, update) => update,
    default: () => null
  }),
  reflection: Annotation({
    reducer: (_, update) => update,
    default: () => null
  }),
  retrievedContext: Annotation({
    reducer: (_, update) => update,
    default: () => []
  }),
  enrichments: Annotation({
    reducer: (_, update) => update,
    default: () => null
  }),
  decision: Annotation({
    reducer: (_, update) => update,
    default: () => null
  }),
  humanApproved: Annotation({
    reducer: (_, update) => update,
    default: () => false
  }),
  retryCount: Annotation({
    reducer: (_, update) => update,
    default: () => 0
  }),
  done: Annotation({
    reducer: (_, update) => update,
    default: () => false
  })
});

/**
 * Builds the LangGraph agent state graph.
 *
 * @param {{ llmClient: { call: (params: { prompt: string, systemPrompt?: string, operationName: string }) => Promise<{ content: string }>, embed: (params: { text: string }) => Promise<number[]> }, reflectionConfidenceThreshold: number, maxReflectionRetries: number, humanApprovalMode: "auto"|"stdin", topK?: number }} options
 */
export function buildAgentGraph({
  llmClient,
  reflectionConfidenceThreshold,
  maxReflectionRetries,
  humanApprovalMode,
  topK
}) {
  const parseNode = createParseNode({ llmClient });
  const reflectNode = createReflectNode({
    llmClient,
    confidenceThreshold: reflectionConfidenceThreshold,
    maxRetries: maxReflectionRetries
  });
  const retrieveNode = createRetrieveNode({ llmClient, topK });
  const enrichNode = createEnrichNode();
  const decideNode = createDecideNode();
  const humanApprovalNode = createHumanApprovalNode({ mode: humanApprovalMode });

  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("parse", parseNode)
    .addNode("reflect", reflectNode)
    .addNode("retrieve", retrieveNode)
    .addNode("enrich", enrichNode)
    .addNode("decide", decideNode)
    .addNode("humanApproval", humanApprovalNode)
    .addEdge(START, "parse")
    .addEdge("parse", "reflect")
    .addConditionalEdges(
      "reflect",
      (state) => {
        if (state.reflection?.needsRetry && state.retryCount <= maxReflectionRetries) {
          return "parse";
        }

        return "retrieve";
      },
      {
        parse: "parse",
        retrieve: "retrieve"
      }
    )
    .addEdge("retrieve", "enrich")
    .addEdge("enrich", "decide")
    .addEdge("decide", "humanApproval")
    .addEdge("humanApproval", END);

  return graph.compile();
}
