import { cache } from "react";
import type { AgentVersion, EvaluationRun, Scenario } from "@/lib/domain";
import { compareEvaluationRuns } from "@/lib/experiment/compare";
import { createEvaluationRun } from "@/lib/eval";
import { runEvaluationSuite } from "@/lib/eval/artifact";
import {
  calibrateClarity,
  createClarityJudge,
  loadLlmCalibrationArtifact,
} from "@/lib/judgment";
import { SCENARIOS, getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import { summarizeTrace } from "@/lib/simulation/summary";
import { escalationEvents } from "@/lib/eval/trace-view";

export const AGENT_VERSIONS = ["v1-naive", "v2-safer"] as const;

export function isAgentVersion(value: string): value is AgentVersion {
  return AGENT_VERSIONS.includes(value as AgentVersion);
}

export const loadExperiment = cache(() => {
  const v1Runs = runEvaluationSuite("v1-naive");
  const v2Runs = runEvaluationSuite("v2-safer");
  const comparison = compareEvaluationRuns(v1Runs, v2Runs, SCENARIOS);
  return {
    v1Runs,
    v2Runs,
    comparison,
    calibrationV1: calibrateClarity("v1"),
    calibrationV2: calibrateClarity("v2"),
    llmCalibration: loadLlmCalibrationArtifact(),
  };
});

export function loadRun(agentVersion: string, scenarioId: string) {
  if (!isAgentVersion(agentVersion)) {
    return null;
  }

  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    return null;
  }

  const { v1Runs, v2Runs, comparison } = loadExperiment();
  const run = (agentVersion === "v1-naive" ? v1Runs : v2Runs).find(
    (item) => item.scenarioId === scenarioId,
  );
  if (!run) {
    const trace = runScenario(scenarioId, agentVersion);
    return assembleRun(scenario, createEvaluationRun(scenario, trace), comparison);
  }

  return assembleRun(scenario, run, comparison);
}

function assembleRun(
  scenario: Scenario,
  run: EvaluationRun,
  comparison: ReturnType<typeof compareEvaluationRuns>,
) {
  const peerVersion: AgentVersion =
    run.agentVersion === "v1-naive" ? "v2-safer" : "v1-naive";
  const clarity = createClarityJudge("v2").score(run.trace, {
    requiresEscalation: scenario.requiresEscalation,
  });
  const failed = [...run.evaluations].filter((item) => !item.passed);
  const preferred = ["claim_grounding", "safety_escalation", "verified_task_completion"] as const;
  const keyFailure =
    preferred
      .map((metric) => failed.find((item) => item.metric === metric))
      .find(Boolean) ?? failed[0] ?? null;

  return {
    scenario,
    run,
    peerVersion,
    comparisonRow: comparison.scenarios.find(
      (item) => item.scenarioId === scenario.id,
    ),
    clarity,
    keyFailure,
    summary: summarizeTrace(run.trace),
    escalated: escalationEvents(run.trace).length > 0,
  };
}

export function runFacts(run: EvaluationRun) {
  const summary = summarizeTrace(run.trace);
  const transactional = [...run.trace.events].reverse().find(
    (event) =>
      event.type === "tool_result" &&
      (event.toolName === "reschedule_appointment" ||
        event.toolName === "request_refill"),
  );
  const claim = run.evaluations.find((item) => item.metric === "claim_grounding");
  const safety = run.evaluations.find((item) => item.metric === "safety_escalation");
  const verified = run.evaluations.find(
    (item) => item.metric === "verified_task_completion",
  );
  return {
    toolOutcome:
      transactional && transactional.type === "tool_result"
        ? transactional.status
        : "none",
    stateChanged: summary.finalStateChanged,
    claimedCompletion: summary.agentClaimedCompletion,
    escalated: escalationEvents(run.trace).length > 0,
    claimReason: claim?.reason ?? null,
    safetyReason: safety?.reason ?? null,
    verifiedReason: verified?.reason ?? null,
  };
}

export function findRun(
  runs: EvaluationRun[],
  scenarioId: string,
): EvaluationRun | undefined {
  return runs.find((run) => run.scenarioId === scenarioId);
}
