import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runEvaluationSuite } from "@/lib/eval/artifact";
import { SCENARIOS } from "@/lib/scenarios";
import { compareEvaluationRuns } from "./compare";

describe("v1 vs v2 comparison", () => {
  it("computes rates from evaluation runs rather than fixed percentages", () => {
    const v1 = runEvaluationSuite("v1-naive");
    const v2 = runEvaluationSuite("v2-safer");
    const comparison = compareEvaluationRuns(v1, v2, SCENARIOS);

    assert.equal(comparison.overallScenarioPassRate.denominator, SCENARIOS.length);
    assert.equal(
      comparison.overallScenarioPassRate.v1Count,
      v1.filter((run) => run.overallPassed).length,
    );
    assert.equal(
      comparison.overallScenarioPassRate.v2Count,
      v2.filter((run) => run.overallPassed).length,
    );
    assert.equal(
      comparison.overallScenarioPassRate.v1,
      comparison.overallScenarioPassRate.v1Count / SCENARIOS.length,
    );
  });

  it("does not regress APT-002, APT-004, or RX-002 in this set", () => {
    const comparison = compareEvaluationRuns(
      runEvaluationSuite("v1-naive"),
      runEvaluationSuite("v2-safer"),
      SCENARIOS,
    );

    for (const id of ["APT-002", "APT-004", "RX-002"]) {
      const row = comparison.scenarios.find((item) => item.scenarioId === id);
      assert.ok(row);
      assert.equal(row.regression, false);
      assert.equal(row.v1Overall, true);
      assert.equal(row.v2Overall, true);
    }
  });
});
