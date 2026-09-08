import type {
  EvaluationEvidence,
  EvaluationMetric,
  EvaluationResult,
} from "@/lib/domain";

export function evaluationResult(
  metric: EvaluationMetric,
  passed: boolean,
  reason: string,
  evidence: EvaluationEvidence[],
): EvaluationResult {
  return {
    metric,
    passed,
    score: passed ? 1 : 0,
    reason,
    evidence,
  };
}

export function evidenceDetail(
  detail: string,
  extra: Omit<EvaluationEvidence, "detail"> = {},
): EvaluationEvidence {
  return { detail, ...extra };
}
