import type {
  AgentVersion,
  EvaluationMetric,
  EvaluationRun,
  Scenario,
} from "@/lib/domain";
import { hasCompletionClaim } from "@/lib/eval/claims";

const METRICS: EvaluationMetric[] = [
  "verified_task_completion",
  "claim_grounding",
  "critical_entity_accuracy",
  "safety_escalation",
];

export interface RatePair {
  v1: number;
  v2: number;
  v1Count: number;
  v2Count: number;
  denominator: number;
}

export interface ScenarioComparison {
  scenarioId: string;
  v1Overall: boolean;
  v2Overall: boolean;
  metricsChanged: Array<{
    metric: EvaluationMetric;
    v1: boolean;
    v2: boolean;
  }>;
  reason: string;
  regression: boolean;
}

export interface ExperimentComparison {
  id: "v1-vs-v2-comparison";
  agents: {
    v1: AgentVersion;
    v2: AgentVersion;
  };
  overallScenarioPassRate: RatePair;
  metricPassRates: Record<EvaluationMetric, RatePair>;
  falseCompletionClaims: { v1: number; v2: number };
  requiredEscalationsHandled: {
    required: number;
    v1: number;
    v2: number;
  };
  scenarios: ScenarioComparison[];
  regressions: ScenarioComparison[];
}

export function compareEvaluationRuns(
  v1Runs: EvaluationRun[],
  v2Runs: EvaluationRun[],
  scenarios: Scenario[],
): ExperimentComparison {
  const denominator = scenarios.length;
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

  const overallScenarioPassRate = ratePair(
    v1Runs.filter((run) => run.overallPassed).length,
    v2Runs.filter((run) => run.overallPassed).length,
    denominator,
  );

  const metricPassRates = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      ratePair(
        countMetricPass(v1Runs, metric),
        countMetricPass(v2Runs, metric),
        denominator,
      ),
    ]),
  ) as Record<EvaluationMetric, RatePair>;

  const scenarioComparisons = scenarios.map((scenario) => {
    const v1 = requireRun(v1Runs, scenario.id);
    const v2 = requireRun(v2Runs, scenario.id);
    const metricsChanged = METRICS.flatMap((metricName) => {
      const v1Passed = metricPassed(v1, metricName);
      const v2Passed = metricPassed(v2, metricName);
      if (v1Passed === v2Passed) {
        return [];
      }
      return [{ metric: metricName, v1: v1Passed, v2: v2Passed }];
    });

    const regression =
      (v1.overallPassed && !v2.overallPassed) ||
      metricsChanged.some((change) => change.v1 && !change.v2);

    return {
      scenarioId: scenario.id,
      v1Overall: v1.overallPassed,
      v2Overall: v2.overallPassed,
      metricsChanged,
      reason: describeChange(v1, v2, metricsChanged),
      regression,
    };
  });

  const requiredEscalationScenarios = scenarios.filter(
    (scenario) => scenario.requiresEscalation,
  );

  return {
    id: "v1-vs-v2-comparison",
    agents: { v1: "v1-naive", v2: "v2-safer" },
    overallScenarioPassRate,
    metricPassRates,
    falseCompletionClaims: {
      v1: countFalseCompletionClaims(v1Runs),
      v2: countFalseCompletionClaims(v2Runs),
    },
    requiredEscalationsHandled: {
      required: requiredEscalationScenarios.length,
      v1: countHandledEscalations(v1Runs, scenarioById),
      v2: countHandledEscalations(v2Runs, scenarioById),
    },
    scenarios: scenarioComparisons,
    regressions: scenarioComparisons.filter((item) => item.regression),
  };
}

function ratePair(v1Count: number, v2Count: number, denominator: number): RatePair {
  return {
    v1: denominator === 0 ? 0 : v1Count / denominator,
    v2: denominator === 0 ? 0 : v2Count / denominator,
    v1Count,
    v2Count,
    denominator,
  };
}

function countMetricPass(runs: EvaluationRun[], metric: EvaluationMetric): number {
  return runs.filter((run) => metricPassed(run, metric)).length;
}

function metricPassed(run: EvaluationRun, metric: EvaluationMetric): boolean {
  return run.evaluations.find((item) => item.metric === metric)?.passed === true;
}

function requireRun(runs: EvaluationRun[], scenarioId: string): EvaluationRun {
  const run = runs.find((item) => item.scenarioId === scenarioId);
  if (!run) {
    throw new Error(`Missing evaluation run for ${scenarioId}`);
  }
  return run;
}

function countFalseCompletionClaims(runs: EvaluationRun[]): number {
  return runs.filter((run) => {
    const groundingFailed = !metricPassed(run, "claim_grounding");
    return groundingFailed && hasCompletionClaim(run.trace);
  }).length;
}

function countHandledEscalations(
  runs: EvaluationRun[],
  scenarios: Map<string, Scenario>,
): number {
  return runs.filter((run) => {
    const scenario = scenarios.get(run.scenarioId);
    return scenario?.requiresEscalation && metricPassed(run, "safety_escalation");
  }).length;
}

function describeChange(
  v1: EvaluationRun,
  v2: EvaluationRun,
  metricsChanged: ScenarioComparison["metricsChanged"],
): string {
  if (metricsChanged.length === 0 && v1.overallPassed === v2.overallPassed) {
    return "No metric or overall-result change.";
  }

  const metricText = metricsChanged
    .map(
      (change) =>
        `${change.metric}: ${change.v1 ? "PASS" : "FAIL"} → ${change.v2 ? "PASS" : "FAIL"}`,
    )
    .join("; ");

  if (v1.overallPassed === v2.overallPassed) {
    return metricText || "No metric change.";
  }

  const overall = `overall: ${v1.overallPassed ? "PASS" : "FAIL"} → ${v2.overallPassed ? "PASS" : "FAIL"}`;
  return metricText ? `${overall}; ${metricText}` : overall;
}
