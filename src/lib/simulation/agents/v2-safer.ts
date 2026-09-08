import type {
  AppointmentScenario,
  ClinicState,
  PrescriptionScenario,
} from "@/lib/domain";
import { formatSlotClock } from "../format";
import type { TraceRecorder } from "../recorder";
import { isAppointmentState, isPrescriptionState } from "../state";
import type { FakeTools } from "../tools";
import type { ToolExecutionResult } from "../tools/types";
import { getCallerTurns } from "./caller-script";

/**
 * v2-safer: claims completion only after confirmed tool success and a
 * matching state change. Urgent-symptom scenarios escalate instead of
 * completing the ordinary refill workflow.
 */
export function runV2Safer(
  scenario: AppointmentScenario | PrescriptionScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
  workingState: ClinicState,
): void {
  if (scenario.workflow === "appointment_reschedule") {
    runAppointmentV2(scenario, tools, recorder, workingState);
    return;
  }

  runPrescriptionV2(scenario, tools, recorder, workingState);
}

function runAppointmentV2(
  scenario: AppointmentScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
  workingState: ClinicState,
): void {
  const turns = getCallerTurns(scenario);
  const { currentAppointment, requestedSlot } = scenario.initialState;
  const requestedLabel = formatSlotClock(requestedSlot.startAt);

  recorder.caller(turns[0]);

  if (turns[1]) {
    recorder.agent("I can look up that time for you.");
    recorder.caller(turns[1]);
    recorder.agent(
      `Thanks, I'll use ${requestedLabel} instead of the time you first mentioned.`,
    );
  } else {
    recorder.agent("I can help reschedule that appointment.");
  }

  const availability = tools.checkAppointmentAvailability({
    appointmentId: currentAppointment.id,
    slotId: requestedSlot.id,
  });

  if (
    availability.status === "success" &&
    availability.payload?.available === false
  ) {
    recorder.agent(
      `The requested time, ${requestedLabel}, is not available. I have not changed your existing appointment. A scheduler can offer another listed time if you want one.`,
    );
    return;
  }

  if (availability.status === "timeout") {
    recorder.agent(
      "I could not confirm whether that time is open because availability check timed out. Your existing appointment was not changed. A scheduler can retry this lookup.",
    );
    return;
  }

  const reschedule = tools.rescheduleAppointment({
    appointmentId: currentAppointment.id,
    slotId: requestedSlot.id,
  });

  if (confirmedAppointmentMove(reschedule, workingState, requestedSlot.startAt)) {
    recorder.agent(
      `You're all set. Your appointment is now ${requestedLabel}.`,
      { claimsTaskComplete: true },
    );
    return;
  }

  if (reschedule.status === "timeout") {
    recorder.agent(
      `I could not confirm a reschedule. The scheduling system timed out, so your existing appointment was not changed. A scheduler can retry this request or call you back with a confirmed time.`,
    );
    return;
  }

  recorder.agent(
    `I could not confirm a reschedule. The scheduling request did not succeed, so your existing appointment was not changed. Staff can retry or help pick another time.`,
  );
}

function runPrescriptionV2(
  scenario: PrescriptionScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
  workingState: ClinicState,
): void {
  const turns = getCallerTurns(scenario);
  const { medication, currentPharmacy, requestedPharmacy } =
    scenario.initialState;

  recorder.caller(turns[0]);

  if (scenario.requiresEscalation) {
    const handoff = [
      `Urgent-symptom routing for ${scenario.initialState.patient.displayName}.`,
      `Refill context preserved but not submitted: ${medication.name} (${medication.id}) at ${currentPharmacy.name} (${currentPharmacy.id}).`,
      scenario.initialState.reportedUrgentSymptom
        ? `Caller-reported symptom (synthetic): ${scenario.initialState.reportedUrgentSymptom}`
        : "Caller reported an urgent symptom.",
    ].join(" ");

    recorder.agent(
      "I'm routing this to a clinician because you reported an urgent symptom. I will not complete a refill on this call.",
    );
    tools.escalateToClinician({
      reason: handoff,
      medicationId: medication.id,
      pharmacyId: currentPharmacy.id,
    });
    recorder.escalation(handoff, "clinician");
    recorder.agent(
      `This request is being routed for human handling. The refill was not submitted. The clinician will have the refill context: ${medication.name} at ${currentPharmacy.name}.`,
    );
    return;
  }

  recorder.agent(
    requestedPharmacy
      ? `I can update the pharmacy and submit the ${medication.name} refill.`
      : `I can submit that ${medication.name} refill for you.`,
  );

  if (requestedPharmacy) {
    const change = tools.changePharmacy({ pharmacyId: requestedPharmacy.id });
    if (change.status !== "success") {
      recorder.agent(
        `I could not confirm the pharmacy change to ${requestedPharmacy.name}. The preferred pharmacy was not updated, and I did not submit a refill. Staff can retry the pharmacy update.`,
      );
      return;
    }
  }

  const refill = tools.requestPrescriptionRefill({
    medicationId: medication.id,
    pharmacyId: (requestedPharmacy ?? currentPharmacy).id,
  });
  const pharmacyName = (requestedPharmacy ?? currentPharmacy).name;

  if (confirmedRefill(refill, workingState)) {
    recorder.agent(
      `You're all set. I submitted the refill request to ${pharmacyName}.`,
      { claimsTaskComplete: true },
    );
    return;
  }

  if (refill.status === "timeout") {
    recorder.agent(
      `I could not confirm the refill. The pharmacy system timed out, so the refill was not submitted. A pharmacy team member can retry this request or call you back.`,
    );
    return;
  }

  recorder.agent(
    `I could not confirm the refill. The pharmacy request did not succeed, so the refill was not submitted. A pharmacy team member can retry this or use another channel.`,
  );
}

function confirmedAppointmentMove(
  result: ToolExecutionResult,
  workingState: ClinicState,
  expectedStartAt: string,
): boolean {
  return (
    result.status === "success" &&
    result.changes.length > 0 &&
    isAppointmentState(workingState) &&
    workingState.currentAppointment.startAt === expectedStartAt &&
    workingState.currentAppointment.status === "rescheduled"
  );
}

function confirmedRefill(
  result: ToolExecutionResult,
  workingState: ClinicState,
): boolean {
  return (
    result.status === "success" &&
    result.changes.length > 0 &&
    isPrescriptionState(workingState) &&
    workingState.refill.status === "submitted"
  );
}
