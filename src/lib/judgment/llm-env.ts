export interface LlmJudgeConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

type EnvMap = Record<string, string | undefined>;

export function readLlmEnv(env: EnvMap = process.env): LlmJudgeConfig {
  const apiKey = env.LLM_API_KEY?.trim();
  return {
    apiKey: apiKey ? apiKey : undefined,
    model: env.LLM_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl: normalizeBaseUrl(env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function isLlmConfigured(env: EnvMap = process.env): boolean {
  return Boolean(readLlmEnv(env).apiKey);
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
