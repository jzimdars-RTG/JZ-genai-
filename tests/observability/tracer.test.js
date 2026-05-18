import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { Tracer } from "../../src/observability/tracer.js";

describe("Tracer", () => {
  test("captures tokens, cost, latency and writes JSONL", async () => {
    const traceDir = fs.mkdtempSync(path.join(os.tmpdir(), "trace-test-"));
    const tracer = new Tracer({
      traceDir,
      now: () => new Date("2026-01-01T00:00:00.000Z")
    });

    await tracer.traceLLMCall({
      operationName: "agent.parse",
      call: async () => ({
        content: "ok",
        usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
        latencyMs: 120,
        model: "gemini-2.0-flash-001",
        provider: "vertexai"
      })
    });

    const lines = fs.readFileSync(tracer.filePath, "utf8").trim().split("\n");
    const entry = JSON.parse(lines[0]);

    expect(entry.totalTokens).toBe(1500);
    expect(entry.costUSD).toBeCloseTo(0.000225, 8);
    expect(entry.latencyMs).toBe(120);
    expect(entry.success).toBe(true);
  });
});
