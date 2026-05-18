/**
 * @typedef {Object} TraceRecord
 * @property {number} latencyMs
 * @property {number} costUSD
 * @property {boolean} success
 */

/**
 * Calculates a quantile from a sorted numeric array.
 *
 * @param {number[]} sorted
 * @param {number} percentileValue
 * @returns {number}
 */
export function percentile(sorted, percentileValue) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * In-memory metrics aggregator for tracing records.
 */
export class MetricsAggregator {
  constructor() {
    /** @type {TraceRecord[]} */
    this.records = [];
  }

  /**
   * @param {TraceRecord} record
   */
  add(record) {
    this.records.push(record);
  }

  /**
   * @returns {{ callCount: number, totalCostUSD: number, errorRate: number, p50LatencyMs: number, p95LatencyMs: number }}
   */
  snapshot() {
    const callCount = this.records.length;
    const totalCostUSD = this.records.reduce((sum, record) => sum + record.costUSD, 0);
    const errorCount = this.records.filter((record) => !record.success).length;
    const sortedLatencies = this.records.map((record) => record.latencyMs).sort((a, b) => a - b);

    return {
      callCount,
      totalCostUSD,
      errorRate: callCount === 0 ? 0 : errorCount / callCount,
      p50LatencyMs: percentile(sortedLatencies, 50),
      p95LatencyMs: percentile(sortedLatencies, 95)
    };
  }
}
