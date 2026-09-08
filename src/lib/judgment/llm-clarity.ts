import type { Trace } from "@/lib/domain";
import { buildClarityJudgeInput } from "./judge-input";
import { readLlmEnv, type LlmJudgeConfig } from "./llm-env";
import { parseLlmClarityResponse } from "./llm-parse";
import {
  LLM_CLARITY_EVALUATOR_VERSION,
  buildLlmClarityMessages,
} from "./llm-prompt";
import type {
  AsyncClarityJudge,
  ClarityJudgeError,
  ClarityJudgeResult,
} from "./types";

export interface LlmClarityAttempt {
  result: ClarityJudgeResult;
  rawModelResponse: string | null;
  model: string;
  evaluatorVersion: string;
}

type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export function createLlmClarityJudge(
  config: LlmJudgeConfig = readLlmEnv(),
  fetchImpl: FetchLike = defaultFetch,
): AsyncClarityJudge {
  return {
    kind: "llm",
    version: LLM_CLARITY_EVALUATOR_VERSION,
    async score(trace, options) {
      const attempt = await scoreLlmClarity(trace, options, config, fetchImpl);
      return attempt.result;
    },
  };
}

export async function scoreLlmClarity(
  trace: Trace,
  options: { requiresEscalation?: boolean } | undefined,
  config: LlmJudgeConfig = readLlmEnv(),
  fetchImpl?: FetchLike,
): Promise<LlmClarityAttempt> {
  const fetchFn = fetchImpl ?? defaultFetch;
  const model = config.model;
  const evaluatorVersion = LLM_CLARITY_EVALUATOR_VERSION;

  if (!config.apiKey) {
    return {
      result: judgeError(
        "missing_config",
        "LLM_API_KEY is not set. Optional LLM calibration cannot run.",
      ),
      rawModelResponse: null,
      model,
      evaluatorVersion,
    };
  }

  const input = buildClarityJudgeInput(trace, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: buildLlmClarityMessages(input),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return {
        result: judgeError(
          "http_error",
          `LLM API returned HTTP ${response.status}${body ? `: ${truncate(body)}` : "."}`,
        ),
        rawModelResponse: body || null,
        model,
        evaluatorVersion,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseLlmClarityResponse(raw);
    return {
      result: parsed.ok ? parsed.judgment : parsed.error,
      rawModelResponse: raw,
      model,
      evaluatorVersion,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        result: judgeError(
          "timeout",
          `LLM API request timed out after ${config.timeoutMs}ms.`,
        ),
        rawModelResponse: null,
        model,
        evaluatorVersion,
      };
    }
    return {
      result: judgeError(
        "api_error",
        error instanceof Error
          ? `LLM API request failed: ${error.message}`
          : "LLM API request failed.",
      ),
      rawModelResponse: null,
      model,
      evaluatorVersion,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function defaultFetch(input: string, init: RequestInit): Promise<Response> {
  return fetch(input, init);
}

function judgeError(
  code: ClarityJudgeError["code"],
  reason: string,
): ClarityJudgeError {
  return {
    metric: "next_step_clarity",
    error: true,
    code,
    reason,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function truncate(value: string, max = 240): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
