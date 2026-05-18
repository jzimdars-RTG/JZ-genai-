/**
 * Creates the decision node.
 */
export function createDecideNode() {
  return async (state) => ({
    decision: {
      shouldApprove: true,
      reason: state.parseResult ? "Parse and enrichment completed." : "Missing parse result."
    }
  });
}
