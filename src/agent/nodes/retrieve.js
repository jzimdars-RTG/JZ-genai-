/**
 * Computes the dot product of two equal-length arrays.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function dotProduct(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Computes the L2 norm of a vector.
 *
 * @param {number[]} v
 * @returns {number}
 */
function l2Norm(v) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/**
 * Cosine similarity between two vectors. Returns 0 if either has zero magnitude.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  const denom = l2Norm(a) * l2Norm(b);
  return denom === 0 ? 0 : dotProduct(a, b) / denom;
}

/**
 * Builds a bag-of-words frequency map from text.
 *
 * @param {string} text
 * @returns {Map<string, number>}
 */
function bowFreq(text) {
  const freq = new Map();
  for (const word of (text.toLowerCase().match(/\w+/g) ?? [])) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return freq;
}

/**
 * Cosine similarity between two bag-of-words frequency maps.
 *
 * @param {Map<string, number>} a
 * @param {Map<string, number>} b
 * @returns {number}
 */
function bowCosine(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [word, va] of a) {
    const vb = b.get(word) ?? 0;
    dot += va * vb;
    magA += va * va;
  }
  for (const vb of b.values()) magB += vb * vb;
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Creates the RAG retrieval node. Scores `state.documents` by similarity to
 * `state.inputText` and stores the top-K results as `retrievedContext`.
 *
 * Embedding strategy:
 * 1. Calls `llmClient.embed({ text })` — uses Vertex AI `text-embedding-004` when
 *    credentials are available.
 * 2. Falls back to bag-of-words cosine similarity when embeddings are unavailable
 *    (empty array returned by `embed()`).
 *
 * @param {{ llmClient: { embed: (params: { text: string }) => Promise<number[]> }, topK?: number }} deps
 */
export function createRetrieveNode({ llmClient, topK = 3 }) {
  return async (state) => {
    /** @type {Array<{ id: string, text: string }>} */
    const documents = state.documents ?? [];

    if (documents.length === 0) {
      return { retrievedContext: [] };
    }

    const queryVec = await llmClient.embed({ text: state.inputText });
    const useEmbeddings = Array.isArray(queryVec) && queryVec.length > 0;

    const scored = await Promise.all(
      documents.map(async (doc) => {
        let score;
        if (useEmbeddings) {
          const docVec = await llmClient.embed({ text: doc.text });
          score = cosineSimilarity(queryVec, docVec);
        } else {
          score = bowCosine(bowFreq(state.inputText), bowFreq(doc.text));
        }
        return { id: doc.id, text: doc.text, score };
      })
    );

    const topDocs = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return { retrievedContext: topDocs };
  };
}
