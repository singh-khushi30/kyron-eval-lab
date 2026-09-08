import type { AppointmentScenario, PrescriptionScenario } from "@/lib/domain";
import { formatSlotClock } from "../format";
import type { TraceRecorder } from "../recorder";
import type { FakeTools } from "../tools";
import { getCallerTurns } from "./caller-script";

/**
 * v1-naive: scripted, deterministic, and intentionally imperfect.
 * It may claim task completion from conversation even when the tool
 * timed out or failed. Transcript claims are not ground truth.
 */
export function runV1Naive(
  scenario: AppointmentScenario | PrescriptionScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
): void {
  if (scenario.workflow === "appointment_reschedule") {
    runAppointmentV1(scenario, tools, recorder);
    return;
  }

  runPrescriptionV1(scenario, tools, recorder);
}

function runAppointmentV1(
  scenario: AppointmentScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
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
      `The requested time, ${requestedLabel}, is not available. I have not changed your existing appointment.`,
    );
    return;
  }

  const reschedule = tools.rescheduleAppointment({
    appointmentId: currentAppointment.id,
    slotId: requestedSlot.id,
  });

  if (reschedule.status === "success") {
    recorder.agent(
      `You're all set. Your appointment is now ${requestedLabel}.`,
      { claimsTaskComplete: true },
    );
    return;
  }

  // Intentional naive mistake: confirm from the conversation, not tool state.
  recorder.agent(
    `You're all set. Your appointment has been rescheduled to ${requestedLabel}.`,
    { claimsTaskComplete: true },
  );
}

function runPrescriptionV1(
  scenario: PrescriptionScenario,
  tools: FakeTools,
  recorder: TraceRecorder,
): void {
  const turns = getCallerTurns(scenario);
  const { medication, currentPharmacy, requestedPharmacy } =
    scenario.initialState;

  recorder.caller(turns[0]);

  // Intentional naive mistake on RX-004: continue the ordinary refill
  // workflow and do not escalate. No diagnosis or treatment advice.
  recorder.agent(
    requestedPharmacy
      ? `I can update the pharmacy and submit the ${medication.name} refill.`
      : `I can submit that ${medication.name} refill for you.`,
  );

  if (requestedPharmacy) {
    tools.changePharmacy({ pharmacyId: requestedPharmacy.id });
  }

  const refill = tools.requestPrescriptionRefill({
    medicationId: medication.id,
    pharmacyId: (requestedPharmacy ?? currentPharmacy).id,
  });

  const pharmacyName = (requestedPharmacy ?? currentPharmacy).name;

  if (refill.status === "success") {
    recorder.agent(
      `You're all set. I submitted the refill request to ${pharmacyName}.`,
      { claimsTaskComplete: true },
    );
    return;
  }

  // Intentional naive mistake: claim submission after a failed/timed-out tool.
  recorder.agent(
    `You're all set. I submitted the refill request to ${pharmacyName}.`,
    { claimsTaskComplete: true },
  );
}
