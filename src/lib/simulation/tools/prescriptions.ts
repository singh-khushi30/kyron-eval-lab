import type { Pharmacy, PrescriptionClinicState } from "@/lib/domain";
import type { Scenario } from "@/lib/domain";
import type {
  ChangePharmacyArgs,
  RequestPrescriptionRefillArgs,
  ToolExecutionResult,
} from "./types";
import { getScriptedBehavior, resolveScriptedStatus } from "./behavior";

function resolvePharmacy(
  state: PrescriptionClinicState,
  pharmacyId: string,
): Pharmacy | undefined {
  if (state.currentPharmacy.id === pharmacyId) {
    return state.currentPharmacy;
  }

  if (state.requestedPharmacy?.id === pharmacyId) {
    return state.requestedPharmacy;
  }

  return undefined;
}

export function executeChangePharmacy(
  scenario: Scenario,
  state: PrescriptionClinicState,
  args: ChangePharmacyArgs,
): ToolExecutionResult {
  const behavior = getScriptedBehavior(scenario, "change_pharmacy");
  const scripted = resolveScriptedStatus(behavior, args);

  if (scripted?.status === "timeout" || scripted?.status === "failure") {
    return {
      status: scripted.status,
      errorMessage: scripted.message,
      payload: { errorCode: scripted.errorCode, pharmacyId: args.pharmacyId },
      changes: [],
    };
  }

  const pharmacy = resolvePharmacy(state, args.pharmacyId);
  if (!pharmacy) {
    return {
      status: "failure",
      errorMessage: "Requested pharmacy is not present in clinic state.",
      payload: { errorCode: "PHARMACY_NOT_FOUND" },
      changes: [],
    };
  }

  const before = { ...state.currentPharmacy };
  state.currentPharmacy = { ...pharmacy };

  return {
    status: "success",
    payload: {
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      message: scripted?.message ?? "Preferred pharmacy updated.",
    },
    changes: [
      {
        path: "currentPharmacy",
        before,
        after: { ...state.currentPharmacy },
      },
    ],
  };
}

export function executeRequestPrescriptionRefill(
  scenario: Scenario,
  state: PrescriptionClinicState,
  args: RequestPrescriptionRefillArgs,
): ToolExecutionResult {
  const behavior = getScriptedBehavior(scenario, "request_refill");
  const scripted = resolveScriptedStatus(behavior, {
    medicationId: args.medicationId,
    ...(args.pharmacyId ? { pharmacyId: args.pharmacyId } : {}),
  });

  if (scripted?.status === "timeout" || scripted?.status === "failure") {
    return {
      status: scripted.status,
      errorMessage: scripted.message,
      payload: {
        errorCode: scripted.errorCode,
        medicationId: args.medicationId,
      },
      changes: [],
    };
  }

  if (state.medication.id !== args.medicationId) {
    return {
      status: "failure",
      errorMessage: "Medication id does not match the current prescription.",
      payload: { errorCode: "MEDICATION_NOT_FOUND" },
      changes: [],
    };
  }

  if (!state.medication.eligibleForRefill) {
    return {
      status: "failure",
      errorMessage: "Medication is not eligible for refill.",
      payload: { errorCode: "REFILL_NOT_ELIGIBLE" },
      changes: [],
    };
  }

  const before = { ...state.refill };
  state.refill = {
    status: "submitted",
    pharmacyId: state.currentPharmacy.id,
  };

  return {
    status: "success",
    payload: {
      medicationId: state.medication.id,
      pharmacyId: state.currentPharmacy.id,
      refillStatus: state.refill.status,
      message: scripted?.message ?? "Refill submitted.",
    },
    changes: [
      {
        path: "refill",
        before,
        after: { ...state.refill },
      },
    ],
  };
}
