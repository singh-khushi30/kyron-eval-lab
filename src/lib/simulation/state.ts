import type {
  AppointmentClinicState,
  ClinicState,
  PrescriptionClinicState,
} from "@/lib/domain";

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export function isAppointmentState(
  state: ClinicState,
): state is AppointmentClinicState {
  return state.workflow === "appointment_reschedule";
}

export function isPrescriptionState(
  state: ClinicState,
): state is PrescriptionClinicState {
  return state.workflow === "prescription_refill";
}

/** Small inspectable slice — not a full record dump. */
export function relevantStateSlice(state: ClinicState): Record<string, unknown> {
  if (isAppointmentState(state)) {
    return {
      appointmentId: state.currentAppointment.id,
      startAt: state.currentAppointment.startAt,
      endAt: state.currentAppointment.endAt,
      status: state.currentAppointment.status,
    };
  }

  return {
    pharmacyId: state.currentPharmacy.id,
    refillStatus: state.refill.status,
    refillPharmacyId: state.refill.pharmacyId,
  };
}

export function didTransactionalStateChange(
  initialState: ClinicState,
  finalState: ClinicState,
): boolean {
  return (
    JSON.stringify(relevantStateSlice(initialState)) !==
    JSON.stringify(relevantStateSlice(finalState))
  );
}
