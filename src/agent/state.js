/**
 * @typedef {Object} AgentState
 * @property {string} inputText
 * @property {Array<{ id: string, text: string }>} documents - Knowledge-base documents for RAG retrieval.
 * @property {unknown} parseResult
 * @property {{ confidence: number, feedback: string, needsRetry: boolean }|null} reflection
 * @property {Array<{ id: string, text: string, score: number }>} retrievedContext - Top-K documents from RAG retrieval.
 * @property {Record<string, unknown>|null} enrichments
 * @property {{ shouldApprove: boolean, reason: string }|null} decision
 * @property {boolean} humanApproved
 * @property {number} retryCount
 * @property {boolean} done
 */

/**
 * Creates an initial agent state.
 *
 * @param {string} inputText
 * @param {Array<{ id: string, text: string }>} [documents]
 * @returns {AgentState}
 */
export function createInitialState(inputText, documents = []) {
  return {
    inputText,
    documents,
    parseResult: null,
    reflection: null,
    retrievedContext: [],
    enrichments: null,
    decision: null,
    humanApproved: false,
    retryCount: 0,
    done: false
  };
}
