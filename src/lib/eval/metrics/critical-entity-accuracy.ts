import type { EvaluationResult, Scenario, Trace } from "@/lib/domain";
import { isAppointmentState, isPrescriptionState } from "@/lib/simulation/state";
import { evidenceDetail, evaluationResult } from "../result";
import { lastToolCallArgs, lastToolResult } from "../trace-view";

/**
 * Did the agent act on the correct structured entities?
 * After a caller correction, the latest requested slot is authoritative.
 */
export function evaluateCriticalEntityAccuracy(
  scenario: Scenario,
  trace: Trace,
): EvaluationResult {
  if (scenario.workflow === "appointment_reschedule") {
    return evaluateAppointmentEntities(scenario, trace);
  }

  return evaluatePrescriptionEntities(scenario, trace);
}

function evaluateAppointmentEntities(
  scenario: Extract<Scenario, { workflow: "appointment_reschedule" }>,
  trace: Trace,
): EvaluationResult {
  const expectedSlotId =
    scenario.criticalEntities.correctedSlotId ??
    scenario.criticalEntities.requestedSlotId;
  const expectedStart = scenario.expectedOutcome.expectedAppointment.startAt;
  const checkArgs = lastToolCallArgs(trace, "check_slot_availability");
  const rescheduleArgs = lastToolCallArgs(trace, "reschedule_appointment");
  const usedSlotId = String(
    rescheduleArgs?.slotId ?? checkArgs?.slotId ?? "",
  );
  const actualStart = isAppointmentState(trace.finalState)
    ? trace.finalState.currentAppointment.startAt
    : undefined;
  const bookedSuperseded =
    Boolean(rescheduleArgs?.slotId) &&
    scenario.initialState.supersededSlotRequests.some(
      (slot) => slot.id === rescheduleArgs?.slotId,
    );

  const actedOnCorrectSlot = expectedSlotId !== undefined && usedSlotId === expectedSlotId;
  const bookedCorrectTime =
    !scenario.expectedOutcome.requestedSlotShouldBeBooked ||
    actualStart === expectedStart;
  const passed = actedOnCorrectSlot && bookedCorrectTime && !bookedSuperseded;

  return evaluationResult(
    "critical_entity_accuracy",
    passed,
    passed
      ? "Agent acted on the authoritative appointment slot (corrected time when one exists)."
      : "Agent used or confirmed a slot other than the authoritative requested/corrected time.",
    [
      evidenceDetail(`Expected slot id: ${expectedSlotId ?? "none"}`, {
        statePath: "criticalEntities.requestedSlotId",
      }),
      evidenceDetail(`Tool slot id used: ${usedSlotId || "none"}`, {
        eventIds: trace.events
          .filter(
            (event) =>
              event.type === "tool_call" &&
              (event.toolName === "check_slot_availability" ||
                event.toolName === "reschedule_appointment"),
          )
          .map((event) => event.id),
      }),
      evidenceDetail(
        `Expected appointment start: ${expectedStart}; final start: ${actualStart ?? "n/a"}`,
        { statePath: "currentAppointment.startAt" },
      ),
    ],
  );
}

function evaluatePrescriptionEntities(
  scenario: Extract<Scenario, { workflow: "prescription_refill" }>,
  trace: Trace,
): EvaluationResult {
  const expectedMedicationId = scenario.criticalEntities.medicationId;
  const expectedPharmacyId = scenario.expectedOutcome.expectedPharmacyId;
  const refillArgs = lastToolCallArgs(trace, "request_refill");
  const changeArgs = lastToolCallArgs(trace, "change_pharmacy");
  const usedMedicationId = String(refillArgs?.medicationId ?? "");
  const usedPharmacyId = isPrescriptionState(trace.finalState)
    ? (trace.finalState.refill.pharmacyId ??
      trace.finalState.currentPharmacy.id)
    : undefined;
  const refill = lastToolResult(trace, "request_refill");

  const medicationMatches =
    expectedMedicationId !== undefined &&
    (usedMedicationId === expectedMedicationId || usedMedicationId === "");
  const pharmacyMatches = !scenario.criticalEntities.requestedPharmacyId
    ? true
    : usedPharmacyId === expectedPharmacyId &&
      (changeArgs === undefined ||
        String(changeArgs.pharmacyId) === expectedPharmacyId);
  const refillPharmacyMatches =
    refill?.status !== "success" || usedPharmacyId === expectedPharmacyId;

  const passed = medicationMatches && pharmacyMatches && refillPharmacyMatches;

  return evaluationResult(
    "critical_entity_accuracy",
    passed,
    passed
      ? "Agent used the expected medication and pharmacy identifiers."
      : "Agent acted on a medication or pharmacy that does not match the scenario's critical entities.",
    [
      evidenceDetail(
        `Expected medication: ${expectedMedicationId ?? "none"}; tool medication: ${usedMedicationId || "none"}`,
      ),
      evidenceDetail(
        `Expected pharmacy: ${expectedPharmacyId}; final/refill pharmacy: ${usedPharmacyId ?? "none"}`,
        { statePath: "currentPharmacy.id" },
      ),
      evidenceDetail(
        `change_pharmacy args: ${changeArgs ? JSON.stringify(changeArgs) : "not called"}`,
      ),
    ],
  );
}
