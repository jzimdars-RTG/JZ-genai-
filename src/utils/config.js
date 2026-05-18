import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  LLM_PRIMARY_PROVIDER: z.enum(["vertexai", "azureai"]).default("vertexai"),
  LLM_FALLBACK_PROVIDER: z.enum(["vertexai", "azureai"]).default("azureai"),
  ENABLE_FALLBACK: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  VERTEX_AI_PROJECT: z.string().optional(),
  VERTEX_AI_LOCATION: z.string().default("us-central1"),
  VERTEX_AI_MODEL: z.string().default("gemini-2.0-flash-001"),
  AZURE_AI_ENDPOINT: z.string().optional(),
  AZURE_AI_KEY: z.string().optional(),
  AZURE_AI_MODEL: z.string().default("Kimi-K2-Instruct"),
  MAX_REFLECTION_RETRIES: z
    .string()
    .default("2")
    .transform((value) => Number.parseInt(value, 10)),
  REFLECTION_CONFIDENCE_THRESHOLD: z
    .string()
    .default("0.7")
    .transform((value) => Number.parseFloat(value)),
  HUMAN_APPROVAL_MODE: z.enum(["auto", "stdin"]).default("auto"),
  TRACE_DIR: z.string().default("traces")
});

/**
 * @typedef {Object} ToolkitConfig
 * @property {"vertexai"|"azureai"} llmPrimaryProvider
 * @property {"vertexai"|"azureai"} llmFallbackProvider
 * @property {boolean} enableFallback
 * @property {string|undefined} vertexProject
 * @property {string} vertexLocation
 * @property {string} vertexModel
 * @property {string|undefined} azureEndpoint
 * @property {string|undefined} azureKey
 * @property {string} azureModel
 * @property {number} maxReflectionRetries
 * @property {number} reflectionConfidenceThreshold
 * @property {"auto"|"stdin"} humanApprovalMode
 * @property {string} traceDir
 */

/**
 * Loads environment configuration and returns typed settings.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {ToolkitConfig}
 */
export function loadConfig(env = process.env) {
  const parsed = schema.parse(env);

  return {
    llmPrimaryProvider: parsed.LLM_PRIMARY_PROVIDER,
    llmFallbackProvider: parsed.LLM_FALLBACK_PROVIDER,
    enableFallback: parsed.ENABLE_FALLBACK,
    vertexProject: parsed.VERTEX_AI_PROJECT,
    vertexLocation: parsed.VERTEX_AI_LOCATION,
    vertexModel: parsed.VERTEX_AI_MODEL,
    azureEndpoint: parsed.AZURE_AI_ENDPOINT,
    azureKey: parsed.AZURE_AI_KEY,
    azureModel: parsed.AZURE_AI_MODEL,
    maxReflectionRetries: parsed.MAX_REFLECTION_RETRIES,
    reflectionConfidenceThreshold: parsed.REFLECTION_CONFIDENCE_THRESHOLD,
    humanApprovalMode: parsed.HUMAN_APPROVAL_MODE,
    traceDir: parsed.TRACE_DIR
  };
}
