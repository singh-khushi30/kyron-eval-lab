import type { ToolStatus } from "@/lib/domain";

export interface CheckAppointmentAvailabilityArgs {
  appointmentId: string;
  slotId: string;
}

export interface RescheduleAppointmentArgs {
  appointmentId: string;
  slotId: string;
}

export interface RequestPrescriptionRefillArgs {
  medicationId: string;
  pharmacyId?: string;
}

export interface ChangePharmacyArgs {
  pharmacyId: string;
}

export interface EscalateToClinicianArgs {
  reason: string;
  medicationId?: string;
  pharmacyId?: string;
}

export interface ToolExecutionResult {
  status: ToolStatus;
  payload?: Record<string, unknown>;
  errorMessage?: string;
  changes: Array<{ path: string; before: unknown; after: unknown }>;
}

export interface FakeTools {
  checkAppointmentAvailability: (
    args: CheckAppointmentAvailabilityArgs,
  ) => ToolExecutionResult;
  rescheduleAppointment: (
    args: RescheduleAppointmentArgs,
  ) => ToolExecutionResult;
  requestPrescriptionRefill: (
    args: RequestPrescriptionRefillArgs,
  ) => ToolExecutionResult;
  changePharmacy: (args: ChangePharmacyArgs) => ToolExecutionResult;
  escalateToClinician: (args: EscalateToClinicianArgs) => ToolExecutionResult;
}
