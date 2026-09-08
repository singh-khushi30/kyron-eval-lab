import type { AgentVersion, EvaluationEvidence, Trace } from "@/lib/domain";

export type ClarityScore = 0 | 1 | 2;

export type ClarityRubricVersion = "v1" | "v2";

export interface ClarityJudgment {
  metric: "next_step_clarity";
  score: ClarityScore;
  reason: string;
  evidence: EvaluationEvidence[];
}

/**
 * Swappable judge. The deterministic fallback is the default so the
 * repo runs without credentials. An LLM client could implement this later.
 */
export interface ClarityJudge {
  version: ClarityRubricVersion;
  score(trace: Trace, options?: { requiresEscalation?: boolean }): ClarityJudgment;
}

export interface ManualClarityLabel {
  id: string;
  scenarioId: string;
  agentVersion: AgentVersion | "calibration";
  kind: "experiment_trace" | "calibration_example";
  humanScore: ClarityScore;
  rationale: string;
  agentResponse: string;
  /** Present only on calibration examples that are not produced by runScenario. */
  embeddedTrace?: Trace;
}

export interface ClarityLabelFile {
  metric: "next_step_clarity";
  scale: [0, 1, 2];
  notes: string;
  labels: ManualClarityLabel[];
}

export interface ClarityCalibrationRow {
  id: string;
  scenarioId: string;
  agentVersion: string;
  kind: ManualClarityLabel["kind"];
  humanScore: ClarityScore;
  evaluatorScore: ClarityScore;
  agreed: boolean;
  absoluteError: number;
  humanRationale: string;
  evaluatorReason: string;
  agentResponse: string;
  evaluatorEvidence: EvaluationEvidence[];
}

export interface ClarityCalibrationArtifact {
  id: string;
  rubricVersion: ClarityRubricVersion;
  judge: "deterministic-fallback";
  rows: ClarityCalibrationRow[];
  experimentTraces: {
    exactAgreementCount: number;
    exactAgreementRate: number;
    meanAbsoluteError: number;
    n: number;
  };
  includingCalibrationExamples: {
    exactAgreementCount: number;
    exactAgreementRate: number;
    meanAbsoluteError: number;
    n: number;
  };
}
