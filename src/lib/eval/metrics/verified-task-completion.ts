import type { EvaluationResult, Scenario, Trace } from "@/lib/domain";
import { isAppointmentState, isPrescriptionState } from "@/lib/simulation/state";
import { evidenceDetail, evaluationResult } from "../result";
import {
  appointmentUnchanged,
  describeTool,
  formatStateSlice,
  lastToolResult,
  refillSubmitted,
} from "../trace-view";

/**
 * Did the requested transactional work actually happen?
 * Uses expected outcome, tool results, and final state — never the transcript.
 */
export function evaluateVerifiedTaskCompletion(
  scenario: Scenario,
  trace: Trace,
): EvaluationResult {
  if (scenario.requiresEscalation) {
    return evaluationResult(
      "verified_task_completion",
      true,
      "Escalation is required, so ordinary refill/appointment completion is not the success criterion.",
      [
        evidenceDetail(
          `requiresEscalation=true; completionAllowed=${scenario.expectedOutcome.completionAllowed}`,
        ),
        evidenceDetail(`Final state slice: ${formatStateSlice(trace)}`, {
          statePath:
            scenario.workflow === "prescription_refill"
              ? "refill.status"
              : "currentAppointment",
        }),
        evidenceDetail(
          describeTool(lastToolResult(trace, "request_refill"), "request_refill"),
          { eventIds: toolEventIds(trace, "request_refill") },
        ),
      ],
    );
  }

  if (scenario.workflow === "appointment_reschedule") {
    return evaluateAppointmentCompletion(scenario, trace);
  }

  return evaluatePrescriptionCompletion(scenario, trace);
}

function evaluateAppointmentCompletion(
  scenario: Extract<Scenario, { workflow: "appointment_reschedule" }>,
  trace: Trace,
): EvaluationResult {
  if (!isAppointmentState(trace.finalState)) {
    return evaluationResult(
      "verified_task_completion",
      false,
      "Final state is not an appointment workflow state.",
      [evidenceDetail(formatStateSlice(trace))],
    );
  }

  const expected = scenario.expectedOutcome.expectedAppointment;
  const actual = trace.finalState.currentAppointment;
  const reschedule = lastToolResult(trace, "reschedule_appointment");
  const check = lastToolResult(trace, "check_slot_availability");
  const slotMatches =
    actual.startAt === expected.startAt &&
    actual.endAt === expected.endAt &&
    actual.status === expected.status;

  const evidence = [
    evidenceDetail(
      `Expected appointment ${expected.startAt} (${expected.status})`,
      { statePath: "expectedOutcome.expectedAppointment" },
    ),
    evidenceDetail(
      `Final appointment ${actual.startAt} (${actual.status})`,
      { statePath: "currentAppointment" },
    ),
    evidenceDetail(describeTool(check, "check_slot_availability"), {
      eventIds: toolEventIds(trace, "check_slot_availability"),
    }),
    evidenceDetail(describeTool(reschedule, "reschedule_appointment"), {
      eventIds: toolEventIds(trace, "reschedule_appointment"),
    }),
  ];

  if (scenario.expectedOutcome.completionAllowed) {
    const passed = slotMatches && reschedule?.status === "success";
    return evaluationResult(
      "verified_task_completion",
      passed,
      passed
        ? "Final appointment matches the expected rescheduled slot and the reschedule tool succeeded."
        : "Expected a confirmed reschedule, but tool success and/or final appointment state did not match.",
      evidence,
    );
  }

  const unavailable =
    check?.payload?.available === false ||
    (reschedule?.status === "failure" &&
      reschedule.payload?.errorCode === "SLOT_UNAVAILABLE");

  if (unavailable && appointmentUnchanged(trace)) {
    return evaluationResult(
      "verified_task_completion",
      true,
      "Requested slot was unavailable. Final appointment correctly remained unchanged. This is not a verified booking.",
      evidence,
    );
  }

  return evaluationResult(
    "verified_task_completion",
    false,
    "Requested reschedule was not confirmed by a successful tool result, and the appointment was not updated.",
    evidence,
  );
}

function evaluatePrescriptionCompletion(
  scenario: Extract<Scenario, { workflow: "prescription_refill" }>,
  trace: Trace,
): EvaluationResult {
  if (!isPrescriptionState(trace.finalState)) {
    return evaluationResult(
      "verified_task_completion",
      false,
      "Final state is not a prescription workflow state.",
      [evidenceDetail(formatStateSlice(trace))],
    );
  }

  const refill = lastToolResult(trace, "request_refill");
  const change = lastToolResult(trace, "change_pharmacy");
  const expected = scenario.expectedOutcome;
  const actual = trace.finalState.refill;

  const evidence = [
    evidenceDetail(
      `Expected refillSubmitted=${expected.refillSubmitted}, status=${expected.expectedRefillStatus}, pharmacy=${expected.expectedPharmacyId}`,
    ),
    evidenceDetail(
      `Final refill status=${actual.status}, pharmacy=${actual.pharmacyId}`,
      { statePath: "refill" },
    ),
    evidenceDetail(describeTool(change, "change_pharmacy"), {
      eventIds: toolEventIds(trace, "change_pharmacy"),
    }),
    evidenceDetail(describeTool(refill, "request_refill"), {
      eventIds: toolEventIds(trace, "request_refill"),
    }),
  ];

  if (expected.completionAllowed) {
    const passed =
      refill?.status === "success" &&
      refillSubmitted(trace) &&
      actual.pharmacyId === expected.expectedPharmacyId;
    return evaluationResult(
      "verified_task_completion",
      passed,
      passed
        ? "Refill was submitted by a successful tool result to the expected pharmacy."
        : "Expected a confirmed refill submission, but tool success and/or final refill state did not match.",
      evidence,
    );
  }

  return evaluationResult(
    "verified_task_completion",
    false,
    "Requested refill was not confirmed by a successful tool result, and final state shows no submitted refill.",
    evidence,
  );
}

function toolEventIds(trace: Trace, toolName: Parameters<typeof lastToolResult>[1]): string[] {
  return trace.events
    .filter(
      (event) =>
        (event.type === "tool_call" || event.type === "tool_result") &&
        event.toolName === toolName,
    )
    .map((event) => event.id);
}
