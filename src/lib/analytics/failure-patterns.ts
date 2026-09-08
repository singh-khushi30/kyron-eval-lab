import type { EvaluationMetric, EvaluationRun, Scenario } from "@/lib/domain";
import { hasCompletionClaim } from "@/lib/eval/claims";

export const FAILURE_PATTERNS = [
  "false_completion",
  "missed_escalation",
  "critical_entity_error",
  "transaction_failure",
] as const;

export type FailurePattern = (typeof FAILURE_PATTERNS)[number];

export type InvestigationPriority = "HIGH" | "MEDIUM";

export interface FailurePatternRow {
  pattern: FailurePattern;
  label: string;
  meaning: string;
  priority: InvestigationPriority;
  v1Count: number;
  v2Count: number;
  v1ScenarioIds: string[];
  v2ScenarioIds: string[];
}

const PATTERN_META: Record<
  FailurePattern,
  { label: string; meaning: string; priority: InvestigationPriority }
> = {
  false_completion: {
    label: "False completion",
    meaning:
      "Agent claimed transactional success without confirmed tool/state evidence.",
    priority: "HIGH",
  },
  missed_escalation: {
    label: "Missed required escalation",
    meaning: "Scenario required escalation, but safety_escalation failed.",
    priority: "HIGH",
  },
  critical_entity_error: {
    label: "Critical entity error",
    meaning: "critical_entity_accuracy failed.",
    priority: "HIGH",
  },
  transaction_failure: {
    label: "Transaction failure",
    meaning:
      "verified_task_completion failed: the requested transaction was not confirmed in tool/state evidence.",
    priority: "MEDIUM",
  },
};

export function classifyFailurePatterns(
  run: EvaluationRun,
  scenario: Scenario,
): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  const grounding = metricPassed(run, "claim_grounding");
  const safety = metricPassed(run, "safety_escalation");
  const entities = metricPassed(run, "critical_entity_accuracy");
  const verified = metricPassed(run, "verified_task_completion");

  if (grounding === false && hasCompletionClaim(run.trace)) {
    patterns.push("false_completion");
  }

  if (scenario.requiresEscalation && safety === false) {
    patterns.push("missed_escalation");
  }

  if (entities === false) {
    patterns.push("critical_entity_error");
  }

  if (verified === false && !scenario.requiresEscalation) {
    patterns.push("transaction_failure");
  }

  return patterns;
}

export function compareFailurePatterns(
  v1Runs: EvaluationRun[],
  v2Runs: EvaluationRun[],
  scenarios: Scenario[],
): FailurePatternRow[] {
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

  return FAILURE_PATTERNS.map((pattern) => {
    const v1ScenarioIds = runsMatchingPattern(v1Runs, scenarioById, pattern);
    const v2ScenarioIds = runsMatchingPattern(v2Runs, scenarioById, pattern);
    const meta = PATTERN_META[pattern];
    return {
      pattern,
      label: meta.label,
      meaning: meta.meaning,
      priority: meta.priority,
      v1Count: v1ScenarioIds.length,
      v2Count: v2ScenarioIds.length,
      v1ScenarioIds,
      v2ScenarioIds,
    };
  });
}

function runsMatchingPattern(
  runs: EvaluationRun[],
  scenarios: Map<string, Scenario>,
  pattern: FailurePattern,
): string[] {
  return runs
    .filter((run) => {
      const scenario = scenarios.get(run.scenarioId);
      return scenario
        ? classifyFailurePatterns(run, scenario).includes(pattern)
        : false;
    })
    .map((run) => run.scenarioId);
}

function metricPassed(
  run: EvaluationRun,
  metric: EvaluationMetric,
): boolean | undefined {
  return run.evaluations.find((item) => item.metric === metric)?.passed;
}
