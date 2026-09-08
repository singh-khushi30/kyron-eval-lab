import type { AgentVersion, EvaluationEvidence, Trace } from "@/lib/domain";

export type ClarityScore = 0 | 1 | 2;

export type ClarityRubricVersion = "v1" | "v2";

export interface ClarityJudgment {
  metric: "next_step_clarity";
  /** False when the requested ordinary transaction actually completed. */
  applicable: boolean;
  score: ClarityScore | null;
  reason: string;
  evidence: EvaluationEvidence[];
}

/**
 * Swappable judge. The deterministic fallback is the default so the
 * repo runs without credentials. An optional LLM judge implements
 * AsyncClarityJudge; evaluation does not depend on it.
 */
export interface ClarityJudge {
  version: ClarityRubricVersion;
  score(trace: Trace, options?: { requiresEscalation?: boolean }): ClarityJudgment;
}

export type ClarityJudgeErrorCode =
  | "missing_config"
  | "api_error"
  | "timeout"
  | "http_error"
  | "empty_response"
  | "malformed_json"
  | "invalid_score"
  | "invalid_response";

export interface ClarityJudgeError {
  metric: "next_step_clarity";
  error: true;
  code: ClarityJudgeErrorCode;
  reason: string;
}

export type ClarityJudgeResult = ClarityJudgment | ClarityJudgeError;

/** Smallest async extension. Deterministic ClarityJudge stays synchronous. */
export interface AsyncClarityJudge {
  kind: "llm";
  version: string;
  score(
    trace: Trace,
    options?: { requiresEscalation?: boolean },
  ): Promise<ClarityJudgeResult>;
}

export interface ClarityJudgeInput {
  agentResponses: string[];
  transactionalCompletionOccurred: boolean;
  relevantTool: {
    name: string;
    status: string;
    errorMessage?: string;
  } | null;
  finalStateChanged: boolean;
  escalationRequired: boolean;
  escalationOccurred: boolean;
  handoffContext: {
    destination: string;
    reason: string;
  } | null;
  requestContext: {
    workflow: string;
    medication?: string;
    pharmacy?: string;
    requestedSlotStartAt?: string;
  };
}

export interface LlmClarityCalibrationRow {
  id: string;
  scenarioId: string;
  agentVersion: string;
  kind: ManualClarityLabel["kind"];
  humanScore: ClarityScore;
  llmScore: ClarityScore | null;
  agreed: boolean | null;
  absoluteError: number | null;
  reason: string | null;
  evidence: string[];
  rawModelResponse: string | null;
  model: string;
  evaluatorVersion: string;
  error?: {
    code: ClarityJudgeErrorCode;
    reason: string;
  };
}

export interface LlmClarityCalibrationArtifact {
  id: "clarity-calibration-llm";
  judge: "llm";
  evaluatorVersion: string;
  model: string;
  rows: LlmClarityCalibrationRow[];
  evaluated: {
    n: number;
    exactAgreementCount: number;
    exactAgreementRate: number;
    meanAbsoluteError: number;
  };
  errors: {
    n: number;
    caseIds: string[];
  };
  disagreements: Array<{
    id: string;
    humanScore: ClarityScore;
    llmScore: ClarityScore;
    reason: string;
  }>;
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
