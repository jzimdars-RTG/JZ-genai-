/**
 * Prints a tracing summary table to stdout.
 *
 * @param {{ callCount: number, totalCostUSD: number, errorRate: number, p50LatencyMs: number, p95LatencyMs: number }} stats
 * @param {(line: string) => void} [write]
 */
export function printTracingSummary(stats, write = (line) => console.log(line)) {
  const lines = [
    "\nTracing Summary",
    "------------------------------",
    `Calls:        ${stats.callCount}`,
    `Total Cost:   $${stats.totalCostUSD.toFixed(6)}`,
    `Error Rate:   ${(stats.errorRate * 100).toFixed(2)}%`,
    `p50 Latency:  ${stats.p50LatencyMs} ms`,
    `p95 Latency:  ${stats.p95LatencyMs} ms`,
    "------------------------------"
  ];

  for (const line of lines) {
    write(line);
  }
}
