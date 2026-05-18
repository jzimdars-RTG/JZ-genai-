/**
 * @typedef {Object} AgentState
 * @property {string} inputText
 * @property {unknown} parseResult
 * @property {{ confidence: number, feedback: string, needsRetry: boolean }|null} reflection
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
 * @returns {AgentState}
 */
export function createInitialState(inputText) {
  return {
    inputText,
    parseResult: null,
    reflection: null,
    enrichments: null,
    decision: null,
    humanApproved: false,
    retryCount: 0,
    done: false
  };
}
