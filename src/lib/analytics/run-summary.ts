import type { AgentVersion, EvaluationRun } from "@/lib/domain";

export interface EvaluationRunSummary {
  agentVersion: AgentVersion;
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failedScenarioIds: string[];
}

export function summarizeEvaluationRuns(
  runs: EvaluationRun[],
): EvaluationRunSummary {
  const passed = runs.filter((run) => run.overallPassed);
  const failed = runs.filter((run) => !run.overallPassed);
  const scenarioCount = runs.length;
  const agentVersion = runs[0]?.agentVersion ?? "v1-naive";

  return {
    agentVersion,
    scenarioCount,
    passedCount: passed.length,
    failedCount: failed.length,
    passRate: scenarioCount === 0 ? 0 : passed.length / scenarioCount,
    failedScenarioIds: failed.map((run) => run.scenarioId),
  };
}
