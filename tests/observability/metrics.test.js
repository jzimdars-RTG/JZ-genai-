import { describe, expect, test } from "@jest/globals";
import { MetricsAggregator } from "../../src/observability/metrics.js";

describe("MetricsAggregator", () => {
  test("calculates p50 and p95 latencies", () => {
    const metrics = new MetricsAggregator();
    metrics.add({ latencyMs: 10, costUSD: 0.01, success: true });
    metrics.add({ latencyMs: 20, costUSD: 0.01, success: true });
    metrics.add({ latencyMs: 50, costUSD: 0.01, success: false });
    metrics.add({ latencyMs: 100, costUSD: 0.01, success: true });

    const summary = metrics.snapshot();

    expect(summary.p50LatencyMs).toBe(20);
    expect(summary.p95LatencyMs).toBe(100);
    expect(summary.errorRate).toBe(0.25);
  });
});
