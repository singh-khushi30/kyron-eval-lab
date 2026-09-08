import type { Scenario } from "@/lib/domain";
import { formatSlotClock } from "../format";
import { isAppointmentState, isPrescriptionState } from "../state";

/**
 * Deterministic caller turns. APT-004 includes an explicit correction so
 * the trace contains the superseded time and the updated intent.
 */
export function getCallerTurns(scenario: Scenario): string[] {
  const { initialState } = scenario;

  if (isAppointmentState(initialState)) {
    const current = formatSlotClock(initialState.currentAppointment.startAt);
    const requested = formatSlotClock(initialState.requestedSlot.startAt);
    const provider = initialState.currentAppointment.providerName;

    if (scenario.id === "APT-004") {
      const firstAsk = initialState.supersededSlotRequests[0];
      const firstTime = firstAsk
        ? formatSlotClock(firstAsk.startAt)
        : "Tuesday at 3:00 PM";
      return [
        `Hi, I need to move my ${current} appointment with ${provider} to ${firstTime}.`,
        `Wait — I meant ${requested}, not that earlier time.`,
      ];
    }

    if (scenario.id === "APT-002") {
      return [
        `I need to move my ${current} visit with ${provider} to ${requested}. That is the only time that works before my (synthetic) midday flight.`,
      ];
    }

    return [
      `Hi, I need to move my ${current} appointment with ${provider} to ${requested}.`,
    ];
  }

  if (isPrescriptionState(initialState)) {
    const medication = initialState.medication.name;
    const currentPharmacy = initialState.currentPharmacy.name;

    if (scenario.id === "RX-002" && initialState.requestedPharmacy) {
      return [
        `Please change my pharmacy from ${currentPharmacy} to ${initialState.requestedPharmacy.name}, then refill ${medication}.`,
      ];
    }

    if (scenario.id === "RX-004" && initialState.reportedUrgentSymptom) {
      return [
        `I need a refill of ${medication}. ${initialState.reportedUrgentSymptom}`,
      ];
    }

    return [`I need a refill of ${medication} at ${currentPharmacy}.`];
  }

  return [scenario.callerGoal];
}
