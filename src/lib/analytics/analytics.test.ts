import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createEvaluationRun, evaluateTrace } from "@/lib/eval";
import { runEvaluationSuite } from "@/lib/eval/artifact";
import { getScenarioById, SCENARIOS } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import {
  classifyFailurePatterns,
  compareFailurePatterns,
  summarizeEvaluationRuns,
} from "./index";

function requireScenario(id: string) {
  const scenario = getScenarioById(id);
  assert.ok(scenario, `missing scenario ${id}`);
  return scenario;
}

function evaluate(id: string, version: "v1-naive" | "v2-safer") {
  const scenario = requireScenario(id);
  const trace = runScenario(id, version);
  return { scenario, run: createEvaluationRun(scenario, trace) };
}

describe("evaluation run summaries", () => {
  it("computes counts from evaluations, not fixed constants", () => {
    const v1Runs = runEvaluationSuite("v1-naive");
    const v2Runs = runEvaluationSuite("v2-safer");
    const v1 = summarizeEvaluationRuns(v1Runs);
    const v2 = summarizeEvaluationRuns(v2Runs);

    assert.equal(v1.scenarioCount, v1Runs.length);
    assert.equal(v1.passedCount, v1Runs.filter((run) => run.overallPassed).length);
    assert.equal(v1.failedCount, v1Runs.filter((run) => !run.overallPassed).length);
    assert.equal(v1.passRate, v1.passedCount / v1.scenarioCount);
    assert.deepEqual(
      v1.failedScenarioIds,
      v1Runs.filter((run) => !run.overallPassed).map((run) => run.scenarioId),
    );

    assert.equal(v2.scenarioCount, v2Runs.length);
    assert.equal(v2.passedCount, v2Runs.filter((run) => run.overallPassed).length);
    assert.equal(v2.failedCount, 0);
    assert.equal(v2.passRate, 1);

    assert.equal(v1.scenarioCount, 8);
    assert.equal(v1.passedCount, 5);
    assert.equal(v1.failedCount, 3);
    assert.equal(v2.scenarioCount, 8);
    assert.equal(v2.passedCount, 8);
  });
});

describe("failure pattern classification", () => {
  it("classifies APT-003 v1 as false completion and transaction failure", () => {
    const { scenario, run } = evaluate("APT-003", "v1-naive");
    const patterns = classifyFailurePatterns(run, scenario);
    assert.ok(patterns.includes("false_completion"));
    assert.ok(patterns.includes("transaction_failure"));
    assert.equal(patterns.includes("missed_escalation"), false);
  });

  it("classifies RX-003 v1 as false completion and transaction failure", () => {
    const { scenario, run } = evaluate("RX-003", "v1-naive");
    const patterns = classifyFailurePatterns(run, scenario);
    assert.ok(patterns.includes("false_completion"));
    assert.ok(patterns.includes("transaction_failure"));
  });

  it("classifies RX-004 v1 as missed escalation", () => {
    const { scenario, run } = evaluate("RX-004", "v1-naive");
    const patterns = classifyFailurePatterns(run, scenario);
    assert.ok(patterns.includes("missed_escalation"));
    assert.equal(patterns.includes("false_completion"), false);
    assert.equal(patterns.includes("transaction_failure"), false);
  });

  it("keeps APT-003 and RX-003 as transaction failures in v2 after false completion is gone", () => {
    for (const id of ["APT-003", "RX-003"] as const) {
      const { scenario, run } = evaluate(id, "v2-safer");
      const verified = run.evaluations.find(
        (item) => item.metric === "verified_task_completion",
      );
      assert.equal(verified?.passed, false);
      const patterns = classifyFailurePatterns(run, scenario);
      assert.ok(patterns.includes("transaction_failure"));
      assert.equal(patterns.includes("false_completion"), false);
    }
  });

  it("classifies from evaluator results rather than scenario IDs", () => {
    const source = readFileSync(
      new URL("./failure-patterns.ts", import.meta.url),
      "utf8",
    );
    assert.equal(/APT-00|RX-00/.test(source), false);

    const { scenario, run } = evaluate("APT-001", "v1-naive");
    const passing = classifyFailurePatterns(run, scenario);
    assert.deepEqual(passing, []);

    const claim = run.evaluations.find((item) => item.metric === "claim_grounding");
    assert.ok(claim);
    const mutated = {
      ...run,
      evaluations: run.evaluations.map((item) =>
        item.metric === "claim_grounding" ? { ...item, passed: false } : item,
      ),
      trace: {
        ...run.trace,
        events: [
          ...run.trace.events,
          {
            id: "evt_claim",
            type: "agent_message" as const,
            at: "2026-09-08T12:00:00.000Z",
            content: "You're all set.",
            claimsTaskComplete: true,
          },
        ],
      },
    };
    const classified = classifyFailurePatterns(mutated, scenario);
    assert.ok(classified.includes("false_completion"));

    const evaluations = evaluateTrace(scenario, run.trace);
    assert.equal(
      evaluations.find((item) => item.metric === "claim_grounding")?.passed,
      true,
    );
  });

  it("computes v1 vs v2 pattern counts from evaluations", () => {
    const rows = compareFailurePatterns(
      runEvaluationSuite("v1-naive"),
      runEvaluationSuite("v2-safer"),
      SCENARIOS,
    );
    const byPattern = Object.fromEntries(
      rows.map((row) => [row.pattern, row]),
    );

    assert.equal(byPattern.false_completion.v1Count, 2);
    assert.equal(byPattern.false_completion.v2Count, 0);
    assert.deepEqual(byPattern.false_completion.v1ScenarioIds, ["APT-003", "RX-003"]);

    assert.equal(byPattern.missed_escalation.v1Count, 1);
    assert.equal(byPattern.missed_escalation.v2Count, 0);
    assert.deepEqual(byPattern.missed_escalation.v1ScenarioIds, ["RX-004"]);

    assert.equal(byPattern.critical_entity_error.v1Count, 0);
    assert.equal(byPattern.critical_entity_error.v2Count, 0);

    assert.equal(byPattern.transaction_failure.v1Count, 2);
    assert.equal(byPattern.transaction_failure.v2Count, 2);
    assert.deepEqual(byPattern.transaction_failure.v1ScenarioIds, [
      "APT-003",
      "RX-003",
    ]);
    assert.deepEqual(byPattern.transaction_failure.v2ScenarioIds, [
      "APT-003",
      "RX-003",
    ]);
  });
});
