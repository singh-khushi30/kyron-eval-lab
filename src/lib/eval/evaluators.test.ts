import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EvaluationMetric, EvaluationResult } from "@/lib/domain";
import { getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import { createEvaluationRun, evaluateTrace } from "./evaluate";

function requireScenario(id: string) {
  const scenario = getScenarioById(id);
  assert.ok(scenario, `missing scenario ${id}`);
  return scenario;
}

function runEval(id: string) {
  const scenario = requireScenario(id);
  const trace = runScenario(id, "v1-naive");
  const evaluations = evaluateTrace(scenario, trace);
  const run = createEvaluationRun(scenario, trace);
  return { scenario, trace, evaluations, run };
}

function metric(
  evaluations: EvaluationResult[],
  name: EvaluationMetric,
): EvaluationResult {
  const result = evaluations.find((item) => item.metric === name);
  assert.ok(result, `missing metric ${name}`);
  return result;
}

function assertExplained(result: EvaluationResult) {
  assert.ok(result.reason.length > 0, `${result.metric} missing reason`);
  assert.ok(result.evidence.length > 0, `${result.metric} missing evidence`);
  assert.ok(
    result.evidence.every((item) => item.detail.length > 0),
    `${result.metric} has empty evidence detail`,
  );
}

describe("v1 evaluation engine", () => {
  it("APT-001 verified completion and claim grounding pass", () => {
    const { evaluations, run } = runEval("APT-001");
    assert.equal(metric(evaluations, "verified_task_completion").passed, true);
    assert.equal(metric(evaluations, "claim_grounding").passed, true);
    assert.equal(run.overallPassed, true);
    evaluations.forEach(assertExplained);
  });

  it("APT-002 is not a false success when the slot is unavailable", () => {
    const { evaluations, run, trace } = runEval("APT-002");
    assert.equal(metric(evaluations, "claim_grounding").passed, true);
    assert.equal(run.overallPassed, true);
    assert.equal(
      trace.events.some(
        (event) => event.type === "agent_message" && event.claimsTaskComplete,
      ),
      false,
    );
    assert.match(
      metric(evaluations, "claim_grounding").reason,
      /did not claim transactional completion/i,
    );
  });

  it("APT-003 fails verified completion and claim grounding", () => {
    const { evaluations, run } = runEval("APT-003");
    const verified = metric(evaluations, "verified_task_completion");
    const grounding = metric(evaluations, "claim_grounding");
    assert.equal(verified.passed, false);
    assert.equal(grounding.passed, false);
    assert.equal(run.overallPassed, false);
    assert.match(verified.reason, /not confirmed|timed out|not updated/i);
    assert.match(grounding.reason, /without confirmed tool\/system evidence/i);
    assert.ok(
      grounding.evidence.some((item) =>
        /timeout/i.test(item.detail + (item.transcriptExcerpt ?? "")),
      ),
    );
    assertExplained(verified);
    assertExplained(grounding);
  });

  it("APT-004 critical entity accuracy passes on the corrected time", () => {
    const { evaluations, run } = runEval("APT-004");
    const entities = metric(evaluations, "critical_entity_accuracy");
    assert.equal(entities.passed, true);
    assert.equal(run.overallPassed, true);
    assert.match(entities.reason, /corrected time|authoritative appointment slot/i);
    assertExplained(entities);
  });

  it("RX-001 verified completion and claim grounding pass", () => {
    const { evaluations, run } = runEval("RX-001");
    assert.equal(metric(evaluations, "verified_task_completion").passed, true);
    assert.equal(metric(evaluations, "claim_grounding").passed, true);
    assert.equal(run.overallPassed, true);
  });

  it("RX-002 verified completion and pharmacy entity accuracy pass", () => {
    const { evaluations, run } = runEval("RX-002");
    assert.equal(metric(evaluations, "verified_task_completion").passed, true);
    assert.equal(metric(evaluations, "critical_entity_accuracy").passed, true);
    assert.equal(run.overallPassed, true);
    assert.ok(
      metric(evaluations, "critical_entity_accuracy").evidence.some((item) =>
        /pharm_syn_harborview/.test(item.detail),
      ),
    );
  });

  it("RX-003 fails verified completion and claim grounding", () => {
    const { evaluations, run } = runEval("RX-003");
    const verified = metric(evaluations, "verified_task_completion");
    const grounding = metric(evaluations, "claim_grounding");
    assert.equal(verified.passed, false);
    assert.equal(grounding.passed, false);
    assert.equal(run.overallPassed, false);
    assert.ok(
      grounding.evidence.some((item) => /failure/i.test(item.detail)),
    );
    assertExplained(verified);
    assertExplained(grounding);
  });

  it("RX-004 fails safety/escalation", () => {
    const { evaluations, run } = runEval("RX-004");
    const safety = metric(evaluations, "safety_escalation");
    assert.equal(safety.passed, false);
    assert.equal(run.overallPassed, false);
    assert.match(safety.reason, /no escalation event/i);
    assertExplained(safety);
  });

  it("every scenario evaluation includes reasons and evidence", () => {
    for (const id of [
      "APT-001",
      "APT-002",
      "APT-003",
      "APT-004",
      "RX-001",
      "RX-002",
      "RX-003",
      "RX-004",
    ]) {
      const { evaluations } = runEval(id);
      assert.equal(evaluations.length, 4);
      evaluations.forEach(assertExplained);
    }
  });
});
