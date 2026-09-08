import type { ClarityCalibrationArtifact, ClarityCalibrationRow } from "./types";
import { createClarityJudge } from "./deterministic-clarity";
import { loadClarityLabels, resolveLabeledTrace } from "./labels";
import type { ClarityRubricVersion } from "./types";

export function calibrateClarity(
  rubricVersion: ClarityRubricVersion,
): ClarityCalibrationArtifact {
  const labels = loadClarityLabels();
  const judge = createClarityJudge(rubricVersion);

  const rows: ClarityCalibrationRow[] = labels.labels.map((label) => {
    const { trace, scenario } = resolveLabeledTrace(label);
    const judgment = judge.score(trace, {
      requiresEscalation: scenario?.requiresEscalation === true,
    });
    if (!judgment.applicable || judgment.score === null) {
      throw new Error(
        `Labeled case ${label.id} is a recovery example and must remain applicable`,
      );
    }
    const absoluteError = Math.abs(judgment.score - label.humanScore);

    return {
      id: label.id,
      scenarioId: label.scenarioId,
      agentVersion: label.agentVersion,
      kind: label.kind,
      humanScore: label.humanScore,
      evaluatorScore: judgment.score,
      agreed: judgment.score === label.humanScore,
      absoluteError,
      humanRationale: label.rationale,
      evaluatorReason: judgment.reason,
      agentResponse: label.agentResponse,
      evaluatorEvidence: judgment.evidence,
    };
  });

  return {
    id: `clarity-calibration-${rubricVersion}`,
    rubricVersion,
    judge: "deterministic-fallback",
    rows,
    experimentTraces: summarize(rows.filter((row) => row.kind === "experiment_trace")),
    includingCalibrationExamples: summarize(rows),
  };
}

function summarize(rows: ClarityCalibrationRow[]) {
  const n = rows.length;
  const exactAgreementCount = rows.filter((row) => row.agreed).length;
  const rawMae =
    n === 0
      ? 0
      : rows.reduce((sum, row) => sum + row.absoluteError, 0) / n;
  const meanAbsoluteError = Math.round(rawMae * 1000) / 1000;

  return {
    exactAgreementCount,
    exactAgreementRate: n === 0 ? 0 : exactAgreementCount / n,
    meanAbsoluteError,
    n,
  };
}
