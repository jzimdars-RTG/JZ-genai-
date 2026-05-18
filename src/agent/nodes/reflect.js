/**
 * @param {string} text
 */
function parseReflection(text) {
  try {
    const parsed = JSON.parse(text);
    const confidence = Number(parsed.confidence ?? 0);

    return {
      confidence: Number.isFinite(confidence) ? confidence : 0,
      feedback: String(parsed.feedback ?? "No feedback provided."),
      needsRetry: Boolean(parsed.needsRetry)
    };
  } catch {
    return {
      confidence: 0,
      feedback: "Reflection response was not JSON.",
      needsRetry: true
    };
  }
}

/**
 * Creates the self-reflection node.
 *
 * @param {{ llmClient: { call: (params: { prompt: string, systemPrompt?: string, operationName: string }) => Promise<{ content: string }> }, confidenceThreshold: number, maxRetries: number }} deps
 */
export function createReflectNode({ llmClient, confidenceThreshold, maxRetries }) {
  return async (state) => {
    const prompt = `Review this parsed output for quality and correctness. Return JSON {\"confidence\": number, \"feedback\": string, \"needsRetry\": boolean}.\n\nParsed output:\n${JSON.stringify(state.parseResult)}`;

    const response = await llmClient.call({
      operationName: "agent.reflect",
      systemPrompt: "You are a strict reviewer. Return JSON only.",
      prompt
    });

    const reflection = parseReflection(response.content);
    const belowThreshold = reflection.confidence < confidenceThreshold;
    const canRetry = state.retryCount < maxRetries;

    return {
      reflection: {
        ...reflection,
        needsRetry: reflection.needsRetry || (belowThreshold && canRetry)
      },
      retryCount: reflection.needsRetry || (belowThreshold && canRetry) ? state.retryCount + 1 : state.retryCount
    };
  };
}
