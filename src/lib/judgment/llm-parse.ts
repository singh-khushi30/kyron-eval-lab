import { evidenceDetail } from "@/lib/eval/result";
import type {
  ClarityJudgeError,
  ClarityJudgeErrorCode,
  ClarityJudgeResult,
  ClarityJudgment,
  ClarityScore,
} from "./types";

export type ParsedLlmClarity =
  | { ok: true; judgment: ClarityJudgment }
  | { ok: false; error: ClarityJudgeError };

export function isClarityJudgeError(
  result: ClarityJudgeResult,
): result is ClarityJudgeError {
  return "error" in result && result.error === true;
}

export function parseLlmClarityResponse(
  raw: string | null | undefined,
): ParsedLlmClarity {
  if (raw == null || raw.trim() === "") {
    return fail("empty_response", "Model returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(raw);
  } catch {
    return fail("malformed_json", "Model response was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("invalid_response", "Model JSON was not an object.");
  }

  const body = parsed as Record<string, unknown>;
  const score = asScore(body.score);
  if (score === null) {
    return fail(
      "invalid_score",
      `Model score must be 0, 1, or 2. Received: ${JSON.stringify(body.score)}`,
    );
  }

  if (typeof body.reason !== "string" || body.reason.trim() === "") {
    return fail("invalid_response", "Model response omitted a reason string.");
  }

  const evidence = asEvidence(body.evidence);
  if (evidence === null) {
    return fail(
      "invalid_response",
      "Model evidence must be an array of strings.",
    );
  }

  return {
    ok: true,
    judgment: {
      metric: "next_step_clarity",
      score,
      reason: body.reason.trim(),
      evidence: evidence.map((item) => evidenceDetail(item)),
    },
  };
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("malformed_json");
  }
}

function asScore(value: unknown): ClarityScore | null {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }
  if (value === "0" || value === "1" || value === "2") {
    return Number(value) as ClarityScore;
  }
  return null;
}

function asEvidence(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((item) => typeof item === "string")) {
    return null;
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function fail(code: ClarityJudgeErrorCode, reason: string): ParsedLlmClarity {
  return {
    ok: false,
    error: {
      metric: "next_step_clarity",
      error: true,
      code,
      reason,
    },
  };
}
