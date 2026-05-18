export const parseResponse = {
  content: JSON.stringify({ intent: "quote_request", passengers: 4 }),
  usage: {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150
  },
  latencyMs: 200,
  model: "gemini-2.0-flash-001",
  provider: "vertexai"
};

export const reflectionNeedsRetryResponse = {
  content: JSON.stringify({ confidence: 0.2, feedback: "Missing required fields", needsRetry: true }),
  usage: {
    inputTokens: 40,
    outputTokens: 20,
    totalTokens: 60
  },
  latencyMs: 100,
  model: "gemini-2.0-flash-001",
  provider: "vertexai"
};

export const reflectionApprovedResponse = {
  content: JSON.stringify({ confidence: 0.9, feedback: "Looks good", needsRetry: false }),
  usage: {
    inputTokens: 40,
    outputTokens: 20,
    totalTokens: 60
  },
  latencyMs: 100,
  model: "gemini-2.0-flash-001",
  provider: "vertexai"
};
