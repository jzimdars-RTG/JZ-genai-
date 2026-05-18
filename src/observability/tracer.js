import fs from "node:fs";
import path from "node:path";
import { MetricsAggregator } from "./metrics.js";

const COST_RATES = {
  "vertexai:gemini-2.0-flash-001": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3
  },
  "azureai:Kimi-K2-Instruct": {
    inputPerMillion: 0,
    outputPerMillion: 0
  }
};

/**
 * @param {string} provider
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number}
 */
export function estimateCostUSD(provider, model, inputTokens, outputTokens) {
  const key = `${provider}:${model}`;
  const rate = COST_RATES[key] ?? { inputPerMillion: 0, outputPerMillion: 0 };

  return (inputTokens / 1_000_000) * rate.inputPerMillion + (outputTokens / 1_000_000) * rate.outputPerMillion;
}

/**
 * Traces LLM calls to JSONL and in-memory metrics.
 */
export class Tracer {
  /**
   * @param {{ traceDir: string, now?: () => Date, metrics?: MetricsAggregator }} options
   */
  constructor({ traceDir, now = () => new Date(), metrics = new MetricsAggregator() }) {
    this.metrics = metrics;
    this.now = now;

    const stamp = now().toISOString().replace(/[:.]/g, "-");
    this.filePath = path.join(traceDir, `run-${stamp}.jsonl`);

    fs.mkdirSync(traceDir, { recursive: true });
  }

  /**
   * @param {{ operationName: string, call: () => Promise<{ content: string, usage: { inputTokens: number, outputTokens: number, totalTokens: number }, latencyMs: number, model: string, provider: string }> }} params
   * @returns {Promise<{ content: string, usage: { inputTokens: number, outputTokens: number, totalTokens: number }, latencyMs: number, model: string, provider: string }>}
   */
  async traceLLMCall({ operationName, call }) {
    const startedAt = Date.now();

    try {
      const result = await call();
      const costUSD = estimateCostUSD(
        result.provider,
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens
      );

      const record = {
        timestamp: this.now().toISOString(),
        operationName,
        provider: result.provider,
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        costUSD,
        latencyMs: result.latencyMs || Date.now() - startedAt,
        success: true
      };

      this.metrics.add({ latencyMs: record.latencyMs, costUSD: record.costUSD, success: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");

      return result;
    } catch (caught) {
      const error = /** @type {Error} */ (caught);
      const latencyMs = Date.now() - startedAt;
      const record = {
        timestamp: this.now().toISOString(),
        operationName,
        provider: "unknown",
        model: "unknown",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        latencyMs,
        success: false,
        error: error.message
      };

      this.metrics.add({ latencyMs, costUSD: 0, success: false });
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
      throw error;
    }
  }

  /**
   * @returns {{ callCount: number, totalCostUSD: number, errorRate: number, p50LatencyMs: number, p95LatencyMs: number }}
   */
  getSummary() {
    return this.metrics.snapshot();
  }
}
