import type { AppointmentClinicState, AppointmentSlot } from "@/lib/domain";
import type { Scenario } from "@/lib/domain";
import type {
  CheckAppointmentAvailabilityArgs,
  RescheduleAppointmentArgs,
  ToolExecutionResult,
} from "./types";
import { getScriptedBehavior, resolveScriptedStatus } from "./behavior";

function findSlot(
  state: AppointmentClinicState,
  slotId: string,
): AppointmentSlot | undefined {
  if (state.requestedSlot.id === slotId) {
    return state.requestedSlot;
  }

  return state.availableSlots.find((slot) => slot.id === slotId);
}

function alternativeSlots(
  state: AppointmentClinicState,
  behaviorAlternatives?: string[],
): Array<{ slotId: string; startAt: string; endAt: string }> {
  const ids =
    behaviorAlternatives ??
    state.availableSlots.filter((slot) => slot.available).map((slot) => slot.id);

  return state.availableSlots
    .filter((slot) => ids.includes(slot.id) && slot.available)
    .map((slot) => ({
      slotId: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
    }));
}

export function executeCheckAppointmentAvailability(
  scenario: Scenario,
  state: AppointmentClinicState,
  args: CheckAppointmentAvailabilityArgs,
): ToolExecutionResult {
  const behavior = getScriptedBehavior(scenario, "check_slot_availability");
  const scripted = resolveScriptedStatus(behavior, args);

  if (scripted?.status === "timeout" || scripted?.status === "failure") {
    return {
      status: scripted.status,
      errorMessage: scripted.message,
      payload: {
        errorCode: scripted.errorCode,
        appointmentId: args.appointmentId,
        slotId: args.slotId,
      },
      changes: [],
    };
  }

  const slot = findSlot(state, args.slotId);
  const available = slot?.available === true;
  const alternatives = alternativeSlots(state, behavior?.alternativeSlotIds);

  return {
    status: "success",
    payload: {
      appointmentId: args.appointmentId,
      slotId: args.slotId,
      available,
      alternatives,
      message:
        scripted?.message ??
        (available
          ? "Requested slot is available."
          : "Requested slot is unavailable."),
    },
    changes: [],
  };
}

export function executeRescheduleAppointment(
  scenario: Scenario,
  state: AppointmentClinicState,
  args: RescheduleAppointmentArgs,
): ToolExecutionResult {
  const behavior = getScriptedBehavior(scenario, "reschedule_appointment");
  const scripted = resolveScriptedStatus(behavior, args);

  if (scripted?.status === "timeout" || scripted?.status === "failure") {
    return {
      status: scripted.status,
      errorMessage: scripted.message,
      payload: {
        errorCode: scripted.errorCode,
        appointmentId: args.appointmentId,
        slotId: args.slotId,
        alternatives: alternativeSlots(state, behavior?.alternativeSlotIds),
      },
      changes: [],
    };
  }

  if (state.currentAppointment.id !== args.appointmentId) {
    return {
      status: "failure",
      errorMessage: "Appointment id does not match the current visit.",
      payload: { errorCode: "APPOINTMENT_NOT_FOUND" },
      changes: [],
    };
  }

  const slot = findSlot(state, args.slotId);
  if (!slot) {
    return {
      status: "failure",
      errorMessage: "Requested slot was not found.",
      payload: { errorCode: "SLOT_NOT_FOUND" },
      changes: [],
    };
  }

  if (!slot.available) {
    return {
      status: "failure",
      errorMessage: "Requested slot is unavailable.",
      payload: {
        errorCode: "SLOT_UNAVAILABLE",
        alternatives: alternativeSlots(state, behavior?.alternativeSlotIds),
      },
      changes: [],
    };
  }

  const before = { ...state.currentAppointment };
  state.currentAppointment = {
    ...state.currentAppointment,
    startAt: slot.startAt,
    endAt: slot.endAt,
    providerName: slot.providerName,
    locationName: slot.locationName,
    status: "rescheduled",
  };

  return {
    status: "success",
    payload: {
      appointmentId: state.currentAppointment.id,
      slotId: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      message: scripted?.message ?? "Appointment rescheduled.",
    },
    changes: [
      {
        path: "currentAppointment",
        before,
        after: { ...state.currentAppointment },
      },
    ],
  };
}
