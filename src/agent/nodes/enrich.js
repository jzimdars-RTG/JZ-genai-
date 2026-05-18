/**
 * Creates the enrichment node.
 */
export function createEnrichNode() {
  return async (state) => ({
    enrichments: {
      normalizedInputLength: state.inputText.length,
      enrichedAt: new Date().toISOString()
    }
  });
}
