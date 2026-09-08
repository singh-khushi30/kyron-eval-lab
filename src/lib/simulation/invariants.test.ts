import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getScenarioById } from "@/lib/scenarios";
import { runV1Naive } from "./agents/v1-naive";
import { createTraceRecorder } from "./recorder";
import { runScenario } from "./runner";
import { cloneState, isAppointmentState, isPrescriptionState } from "./state";
import { createFakeTools } from "./tools";
import type { AppointmentScenario, PrescriptionScenario } from "@/lib/domain";

function requireScenario(id: string) {
  const scenario = getScenarioById(id);
  assert.ok(scenario, `missing scenario ${id}`);
  return scenario;
}

describe("simulation invariants", () => {
  it("does not mutate state on a failed reschedule", () => {
    const scenario = requireScenario("APT-002") as AppointmentScenario;
    const state = cloneState(scenario.initialState);
    const before = cloneState(state.currentAppointment);
    const recorder = createTraceRecorder(scenario.id, "v1-naive", state);
    const tools = createFakeTools(scenario, state, recorder);

    const result = tools.rescheduleAppointment({
      appointmentId: state.currentAppointment.id,
      slotId: state.requestedSlot.id,
    });

    assert.equal(result.status, "failure");
    assert.deepEqual(state.currentAppointment, before);
    assert.equal(result.changes.length, 0);
  });

  it("does not mutate state on a timed-out reschedule", () => {
    const scenario = requireScenario("APT-003") as AppointmentScenario;
    const state = cloneState(scenario.initialState);
    const before = cloneState(state.currentAppointment);
    const recorder = createTraceRecorder(scenario.id, "v1-naive", state);
    const tools = createFakeTools(scenario, state, recorder);

    const result = tools.rescheduleAppointment({
      appointmentId: state.currentAppointment.id,
      slotId: state.requestedSlot.id,
    });

    assert.equal(result.status, "timeout");
    assert.deepEqual(state.currentAppointment, before);
    assert.equal(result.changes.length, 0);
  });

  it("does not mutate refill state on a failed refill", () => {
    const scenario = requireScenario("RX-003") as PrescriptionScenario;
    const state = cloneState(scenario.initialState);
    const before = cloneState(state.refill);
    const recorder = createTraceRecorder(scenario.id, "v1-naive", state);
    const tools = createFakeTools(scenario, state, recorder);

    const result = tools.requestPrescriptionRefill({
      medicationId: state.medication.id,
    });

    assert.equal(result.status, "failure");
    assert.deepEqual(state.refill, before);
    assert.equal(state.refill.status, "not_requested");
  });

  it("changes the appointment on a successful reschedule", () => {
    const scenario = requireScenario("APT-001") as AppointmentScenario;
    const trace = runScenario("APT-001", "v1-naive");
    assert.ok(isAppointmentState(trace.finalState));
    assert.deepEqual(
      trace.finalState.currentAppointment,
      scenario.expectedOutcome.expectedAppointment,
    );
  });

  it("changes the pharmacy on a successful pharmacy change", () => {
    const scenario = requireScenario("RX-002") as PrescriptionScenario;
    const trace = runScenario("RX-002", "v1-naive");
    assert.ok(isPrescriptionState(trace.finalState));
    assert.equal(
      trace.finalState.currentPharmacy.id,
      scenario.expectedOutcome.expectedPharmacyId,
    );
    assert.equal(trace.finalState.refill.status, "submitted");
    assert.equal(
      trace.finalState.refill.pharmacyId,
      scenario.expectedOutcome.expectedPharmacyId,
    );
  });

  it("starts each scenario from its own cloned initial state", () => {
    const apt001 = requireScenario("APT-001");
    const snapshot = JSON.stringify(apt001.initialState);

    const first = runScenario("APT-001", "v1-naive");
    const second = runScenario("APT-002", "v1-naive");

    assert.equal(JSON.stringify(apt001.initialState), snapshot);
    assert.ok(isAppointmentState(first.finalState));
    assert.ok(isAppointmentState(second.finalState));
    assert.notEqual(
      first.finalState.currentAppointment.startAt,
      second.finalState.currentAppointment.startAt,
    );
    assert.equal(
      JSON.stringify(second.initialState),
      JSON.stringify(requireScenario("APT-002").initialState),
    );
  });

  it("APT-003 times out and does not change the appointment", () => {
    const scenario = requireScenario("APT-003") as AppointmentScenario;
    const trace = runScenario("APT-003", "v1-naive");
    const timeout = trace.events.find(
      (event) =>
        event.type === "tool_result" &&
        event.toolName === "reschedule_appointment" &&
        event.status === "timeout",
    );

    assert.ok(timeout);
    assert.ok(isAppointmentState(trace.finalState));
    assert.deepEqual(
      trace.finalState.currentAppointment,
      scenario.initialState.currentAppointment,
    );
    assert.ok(
      trace.events.some(
        (event) => event.type === "agent_message" && event.claimsTaskComplete,
      ),
    );
  });

  it("RX-003 fails and does not submit a refill", () => {
    const trace = runScenario("RX-003", "v1-naive");
    const failure = trace.events.find(
      (event) =>
        event.type === "tool_result" &&
        event.toolName === "request_refill" &&
        event.status === "failure",
    );

    assert.ok(failure);
    assert.ok(isPrescriptionState(trace.finalState));
    assert.equal(trace.finalState.refill.status, "not_requested");
    assert.ok(
      trace.events.some(
        (event) => event.type === "agent_message" && event.claimsTaskComplete,
      ),
    );
  });

  it("APT-004 records the caller correction and books the corrected slot", () => {
    const scenario = requireScenario("APT-004") as AppointmentScenario;
    const trace = runScenario("APT-004", "v1-naive");
    const callerMessages = trace.events.filter(
      (event) => event.type === "caller_message",
    );

    assert.equal(callerMessages.length, 2);
    assert.match(callerMessages[1].content, /meant/i);
    assert.ok(isAppointmentState(trace.finalState));
    assert.equal(
      trace.finalState.currentAppointment.startAt,
      scenario.expectedOutcome.expectedAppointment.startAt,
    );
  });

  it("is deterministic across repeated runs", () => {
    const first = runScenario("APT-001", "v1-naive");
    const second = runScenario("APT-001", "v1-naive");
    assert.deepEqual(first.events, second.events);
    assert.deepEqual(first.finalState, second.finalState);
  });

  it("does not escalate on RX-004 and continues the refill workflow", () => {
    const trace = runScenario("RX-004", "v1-naive");
    assert.equal(
      trace.events.some((event) => event.type === "escalation"),
      false,
    );
    assert.ok(isPrescriptionState(trace.finalState));
    assert.equal(trace.finalState.refill.status, "submitted");
    assert.equal(
      trace.events.some(
        (event) =>
          event.type === "agent_message" &&
          /diagnos|heart attack|aspirin|emergency/i.test(event.content),
      ),
      false,
    );
  });
});

describe("v1 harness wiring", () => {
  it("records tool calls, results, and state changes in order for APT-001", () => {
    const scenario = requireScenario("APT-001") as AppointmentScenario;
    const state = cloneState(scenario.initialState);
    const recorder = createTraceRecorder(scenario.id, "v1-naive", state);
    const tools = createFakeTools(scenario, state, recorder);
    runV1Naive(scenario, tools, recorder);
    const trace = recorder.finalize(state);
    const types = trace.events.map((event) => event.type);

    assert.ok(types.includes("caller_message"));
    assert.ok(types.includes("agent_message"));
    assert.ok(types.includes("tool_call"));
    assert.ok(types.includes("tool_result"));
    assert.ok(types.includes("state_change"));
    assert.ok(
      types.lastIndexOf("tool_call") < types.lastIndexOf("tool_result"),
    );
  });
});
