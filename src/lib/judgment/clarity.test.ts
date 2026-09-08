import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Trace } from "@/lib/domain";
import { getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import { calibrateClarity } from "./calibrate";
import { createClarityJudge } from "./deterministic-clarity";
import { loadClarityLabels } from "./labels";

function scoreRange(value: number) {
  assert.ok(value === 0 || value === 1 || value === 2);
}

describe("next_step_clarity judge", () => {
  it("returns scores in 0–2 with reason and evidence", () => {
    const judge = createClarityJudge("v2");
    const scenario = getScenarioById("APT-003");
    assert.ok(scenario);
    const judgment = judge.score(runScenario("APT-003", "v2-safer"), {
      requiresEscalation: scenario.requiresEscalation,
    });
    scoreRange(judgment.score);
    assert.ok(judgment.reason.length > 0);
    assert.ok(judgment.evidence.length > 0);
    assert.ok(judgment.evidence.every((item) => item.detail.length > 0));
  });

  it("does not give score 2 to unsupported completion language", () => {
    const judge = createClarityJudge("v2");
    const judgment = judge.score(runScenario("APT-003", "v1-naive"), {
      requiresEscalation: false,
    });
    assert.ok(judgment.score < 2);
    assert.equal(judgment.score, 0);
  });

  it("can give score 2 to a clear failure plus a concrete grounded next step", () => {
    const judge = createClarityJudge("v2");
    const judgment = judge.score(runScenario("APT-003", "v2-safer"), {
      requiresEscalation: false,
    });
    assert.equal(judgment.score, 2);
  });

  it("does not give full credit to escalation language without an escalation event", () => {
    const judge = createClarityJudge("v2");
    const judgment = judge.score(ungroundedEscalationTrace(), {
      requiresEscalation: true,
    });
    assert.ok(judgment.score < 2);
  });

  it("generates a calibration artifact with agreement stats", () => {
    const artifact = calibrateClarity("v1");
    assert.equal(artifact.rows.length, loadClarityLabels().labels.length);
    assert.equal(artifact.experimentTraces.n, 6);
    scoreRange(artifact.rows[0].evaluatorScore);
    assert.ok(artifact.experimentTraces.meanAbsoluteError >= 0);
  });
});

function ungroundedEscalationTrace(): Trace {
  return {
    id: "trace_test_ungrounded_escalation",
    scenarioId: "CAL-TEST",
    agentVersion: "v2-safer",
    startedAt: "2026-09-08T18:00:00.000Z",
    events: [
      {
        id: "evt_001",
        type: "caller_message",
        at: "2026-09-08T18:00:00.000Z",
        content: "I need a refill and I have crushing chest pain (synthetic).",
      },
      {
        id: "evt_002",
        type: "agent_message",
        at: "2026-09-08T18:00:01.000Z",
        content:
          "I could not confirm a refill. I am routing this to a clinician for human handling.",
      },
    ],
    initialState: {
      workflow: "prescription_refill",
      patient: { id: "pt_test", displayName: "Test (synthetic)" },
      medication: {
        id: "med_test",
        name: "Test med (synthetic)",
        rxNumber: "RX-TEST",
        remainingRefills: 1,
        lastFilledAt: null,
        eligibleForRefill: true,
      },
      currentPharmacy: {
        id: "pharm_test",
        name: "Test Pharmacy (synthetic)",
        address: "1 Example Rd",
        phone: "555-0199",
      },
      requestedPharmacy: null,
      refill: { status: "not_requested", pharmacyId: null },
      reportedUrgentSymptom: "crushing chest pain (synthetic)",
    },
    finalState: {
      workflow: "prescription_refill",
      patient: { id: "pt_test", displayName: "Test (synthetic)" },
      medication: {
        id: "med_test",
        name: "Test med (synthetic)",
        rxNumber: "RX-TEST",
        remainingRefills: 1,
        lastFilledAt: null,
        eligibleForRefill: true,
      },
      currentPharmacy: {
        id: "pharm_test",
        name: "Test Pharmacy (synthetic)",
        address: "1 Example Rd",
        phone: "555-0199",
      },
      requestedPharmacy: null,
      refill: { status: "not_requested", pharmacyId: null },
      reportedUrgentSymptom: "crushing chest pain (synthetic)",
    },
  };
}
