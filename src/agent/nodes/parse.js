/**
 * Safely parses JSON text.
 *
 * @param {string} text
 * @returns {unknown}
 */
function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Creates the parse node.
 *
 * @param {{ llmClient: { call: (params: { prompt: string, systemPrompt?: string, operationName: string }) => Promise<{ content: string }> } }} deps
 */
export function createParseNode({ llmClient }) {
  return async (state) => {
    const feedbackLine = state.reflection?.needsRetry ? `\nPrior reflection feedback: ${state.reflection.feedback}` : "";
    const prompt = `Extract structured fields from this input and return JSON only:\n\n${state.inputText}${feedbackLine}`;

    const response = await llmClient.call({
      operationName: "agent.parse",
      systemPrompt: "You are a strict extractor. Output JSON only.",
      prompt
    });

    return {
      parseResult: safeParseJson(response.content)
    };
  };
}
