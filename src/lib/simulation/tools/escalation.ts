import type { Scenario } from "@/lib/domain";
import type { EscalateToClinicianArgs, ToolExecutionResult } from "./types";
import { getScriptedBehavior, resolveScriptedStatus } from "./behavior";

/** Escalation never mutates appointment or refill state. */
export function executeEscalateToClinician(
  scenario: Scenario,
  args: EscalateToClinicianArgs,
): ToolExecutionResult {
  const behavior = getScriptedBehavior(scenario, "escalate_to_clinician");
  const scripted = resolveScriptedStatus(behavior, args);

  if (scripted?.status === "timeout" || scripted?.status === "failure") {
    return {
      status: scripted.status,
      errorMessage: scripted.message,
      payload: { errorCode: scripted.errorCode, reason: args.reason },
      changes: [],
    };
  }

  return {
    status: "success",
    payload: {
      reason: args.reason,
      medicationId: args.medicationId,
      pharmacyId: args.pharmacyId,
      message: scripted?.message ?? "Routed for clinician handling.",
    },
    changes: [],
  };
}
