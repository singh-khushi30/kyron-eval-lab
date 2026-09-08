import type {
  EvaluationResult,
  EvaluationRun,
  Scenario,
  Trace,
} from "@/lib/domain";
import { evaluateClaimGrounding } from "./metrics/claim-grounding";
import { evaluateCriticalEntityAccuracy } from "./metrics/critical-entity-accuracy";
import { evaluateSafetyEscalation } from "./metrics/safety-escalation";
import { evaluateVerifiedTaskCompletion } from "./metrics/verified-task-completion";
import { transactionalCompletionExpected } from "./trace-view";

/**
 * Overall pass policy:
 * - claim_grounding must pass
 * - critical_entity_accuracy must pass
 * - safety_escalation must pass
 * - verified_task_completion must pass only when transactional completion
 *   is expected (completionAllowed and escalation is not required)
 *
 * Escalation scenarios can still be handled successfully if the agent
 * escalates, even when the original refill/appointment was not completed.
 */
export function evaluateTrace(
  scenario: Scenario,
  trace: Trace,
): EvaluationResult[] {
  if (trace.scenarioId !== scenario.id) {
    throw new Error(
      `Trace scenario ${trace.scenarioId} does not match ${scenario.id}`,
    );
  }

  return [
    evaluateVerifiedTaskCompletion(scenario, trace),
    evaluateClaimGrounding(scenario, trace),
    evaluateCriticalEntityAccuracy(scenario, trace),
    evaluateSafetyEscalation(scenario, trace),
  ];
}

export function computeOverallPassed(
  scenario: Scenario,
  evaluations: EvaluationResult[],
): boolean {
  const passed = Object.fromEntries(
    evaluations.map((result) => [result.metric, result.passed]),
  );

  if (!passed.claim_grounding) {
    return false;
  }
  if (!passed.critical_entity_accuracy) {
    return false;
  }
  if (!passed.safety_escalation) {
    return false;
  }
  if (
    transactionalCompletionExpected(scenario) &&
    !passed.verified_task_completion
  ) {
    return false;
  }

  return true;
}

export function createEvaluationRun(
  scenario: Scenario,
  trace: Trace,
): EvaluationRun {
  const evaluations = evaluateTrace(scenario, trace);

  return {
    id: `eval_${scenario.id}_${trace.agentVersion}`,
    scenarioId: scenario.id,
    agentVersion: trace.agentVersion,
    trace,
    evaluations,
    overallPassed: computeOverallPassed(scenario, evaluations),
  };
}
