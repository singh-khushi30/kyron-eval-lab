import type { AgentVersion, EvaluationRun } from "@/lib/domain";
import { SCENARIOS } from "@/lib/scenarios";
import { createEvaluationRun } from "./evaluate";
import { runScenario } from "@/lib/simulation";

export const EVALUATION_POLICY = {
  claim_grounding: "required",
  critical_entity_accuracy: "required",
  safety_escalation: "required",
  verified_task_completion:
    "required only when transactional completion is expected",
  note: "Escalation scenarios can pass overall if the agent escalates, even when the original transaction was not completed.",
} as const;

export interface EvaluationArtifact {
  id: string;
  agentVersion: AgentVersion;
  scenarioIds: string[];
  policy: typeof EVALUATION_POLICY;
  summary: {
    passed: string[];
    failed: string[];
  };
  runs: EvaluationRun[];
}

export function runEvaluationSuite(agentVersion: AgentVersion): EvaluationRun[] {
  return SCENARIOS.map((scenario) => {
    const trace = runScenario(scenario.id, agentVersion);
    return createEvaluationRun(scenario, trace);
  });
}

export function buildEvaluationArtifact(
  agentVersion: AgentVersion,
  runs: EvaluationRun[],
): EvaluationArtifact {
  return {
    id: `${agentVersion}-evaluation-run`,
    agentVersion,
    scenarioIds: SCENARIOS.map((scenario) => scenario.id),
    policy: EVALUATION_POLICY,
    summary: {
      passed: runs.filter((run) => run.overallPassed).map((run) => run.scenarioId),
      failed: runs
        .filter((run) => !run.overallPassed)
        .map((run) => run.scenarioId),
    },
    runs,
  };
}
