import { loadClarityLabels, resolveLabeledTrace } from "./labels";
import { isClarityJudgeError } from "./llm-parse";
import { scoreLlmClarity, type LlmClarityAttempt } from "./llm-clarity";
import { readLlmEnv, type LlmJudgeConfig } from "./llm-env";
import { LLM_CLARITY_EVALUATOR_VERSION } from "./llm-prompt";
import type {
  LlmClarityCalibrationArtifact,
  LlmClarityCalibrationRow,
} from "./types";

export async function calibrateClarityLlm(
  config: LlmJudgeConfig = readLlmEnv(),
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>,
): Promise<LlmClarityCalibrationArtifact> {
  const labels = loadClarityLabels();
  const rows: LlmClarityCalibrationRow[] = [];

  for (const label of labels.labels) {
    const { trace, scenario } = resolveLabeledTrace(label);
    const attempt = await scoreLlmClarity(
      trace,
      { requiresEscalation: scenario?.requiresEscalation === true },
      config,
      fetchImpl,
    );
    rows.push(toRow(label.id, label, attempt));
  }

  return summarizeLlmCalibration(rows, config.model);
}

export function summarizeLlmCalibration(
  rows: LlmClarityCalibrationRow[],
  model: string,
): LlmClarityCalibrationArtifact {
  const evaluated = rows.filter((row) => row.error === undefined);
  const errored = rows.filter((row) => row.error !== undefined);
  const agreements = evaluated.filter((row) => row.agreed === true);
  const n = evaluated.length;
  const mae =
    n === 0
      ? 0
      : evaluated.reduce((sum, row) => sum + (row.absoluteError ?? 0), 0) / n;

  return {
    id: "clarity-calibration-llm",
    judge: "llm",
    evaluatorVersion: LLM_CLARITY_EVALUATOR_VERSION,
    model,
    rows,
    evaluated: {
      n,
      exactAgreementCount: agreements.length,
      exactAgreementRate: n === 0 ? 0 : agreements.length / n,
      meanAbsoluteError: Math.round(mae * 1000) / 1000,
    },
    errors: {
      n: errored.length,
      caseIds: errored.map((row) => row.id),
    },
    disagreements: evaluated
      .filter((row) => row.agreed === false && row.llmScore !== null)
      .map((row) => ({
        id: row.id,
        humanScore: row.humanScore,
        llmScore: row.llmScore as 0 | 1 | 2,
        reason: row.reason ?? "",
      })),
  };
}

function toRow(
  id: string,
  label: {
    scenarioId: string;
    agentVersion: string;
    kind: LlmClarityCalibrationRow["kind"];
    humanScore: LlmClarityCalibrationRow["humanScore"];
  },
  attempt: LlmClarityAttempt,
): LlmClarityCalibrationRow {
  const base = {
    id,
    scenarioId: label.scenarioId,
    agentVersion: label.agentVersion,
    kind: label.kind,
    humanScore: label.humanScore,
    rawModelResponse: attempt.rawModelResponse,
    model: attempt.model,
    evaluatorVersion: attempt.evaluatorVersion,
  };

  if (isClarityJudgeError(attempt.result)) {
    return {
      ...base,
      llmScore: null,
      agreed: null,
      absoluteError: null,
      reason: attempt.result.reason,
      evidence: [],
      error: {
        code: attempt.result.code,
        reason: attempt.result.reason,
      },
    };
  }

  const score = attempt.result.score;
  if (score === null) {
    return {
      ...base,
      llmScore: null,
      agreed: null,
      absoluteError: null,
      reason: attempt.result.reason,
      evidence: [],
    };
  }

  return {
    ...base,
    llmScore: score,
    agreed: score === label.humanScore,
    absoluteError: Math.abs(score - label.humanScore),
    reason: attempt.result.reason,
    evidence: attempt.result.evidence.map((item) => item.detail),
  };
}
