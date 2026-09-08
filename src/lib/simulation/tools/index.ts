import type { ClinicState, Scenario, ToolName } from "@/lib/domain";
import type { TraceRecorder } from "../recorder";
import { isAppointmentState, isPrescriptionState, relevantStateSlice } from "../state";
import { asToolArgs } from "./behavior";
import {
  executeCheckAppointmentAvailability,
  executeRescheduleAppointment,
} from "./appointments";
import {
  executeChangePharmacy,
  executeRequestPrescriptionRefill,
} from "./prescriptions";
import type {
  ChangePharmacyArgs,
  CheckAppointmentAvailabilityArgs,
  FakeTools,
  RequestPrescriptionRefillArgs,
  RescheduleAppointmentArgs,
  ToolExecutionResult,
} from "./types";

export type { FakeTools } from "./types";

function wrongWorkflow(toolName: ToolName): ToolExecutionResult {
  return {
    status: "failure",
    errorMessage: `Tool ${toolName} is not valid for this workflow.`,
    payload: { errorCode: "WRONG_WORKFLOW" },
    changes: [],
  };
}

function invokeTool(
  recorder: TraceRecorder,
  state: ClinicState,
  toolName: ToolName,
  args: object,
  execute: () => ToolExecutionResult,
): ToolExecutionResult {
  const stateBefore = relevantStateSlice(state);
  recorder.toolCall(toolName, asToolArgs(args));

  const result = execute();
  const stateAfter = relevantStateSlice(state);

  recorder.toolResult({
    toolName,
    status: result.status,
    payload: result.payload,
    errorMessage: result.errorMessage,
    stateBefore,
    stateAfter,
  });

  for (const change of result.changes) {
    recorder.stateChange(change.path, change.before, change.after);
  }

  return result;
}

export function createFakeTools(
  scenario: Scenario,
  state: ClinicState,
  recorder: TraceRecorder,
): FakeTools {
  return {
    checkAppointmentAvailability(args: CheckAppointmentAvailabilityArgs) {
      return invokeTool(
        recorder,
        state,
        "check_slot_availability",
        args,
        () => {
          if (!isAppointmentState(state)) {
            return wrongWorkflow("check_slot_availability");
          }
          return executeCheckAppointmentAvailability(scenario, state, args);
        },
      );
    },
    rescheduleAppointment(args: RescheduleAppointmentArgs) {
      return invokeTool(recorder, state, "reschedule_appointment", args, () => {
        if (!isAppointmentState(state)) {
          return wrongWorkflow("reschedule_appointment");
        }
        return executeRescheduleAppointment(scenario, state, args);
      });
    },
    changePharmacy(args: ChangePharmacyArgs) {
      return invokeTool(recorder, state, "change_pharmacy", args, () => {
        if (!isPrescriptionState(state)) {
          return wrongWorkflow("change_pharmacy");
        }
        return executeChangePharmacy(scenario, state, args);
      });
    },
    requestPrescriptionRefill(args: RequestPrescriptionRefillArgs) {
      return invokeTool(recorder, state, "request_refill", args, () => {
        if (!isPrescriptionState(state)) {
          return wrongWorkflow("request_refill");
        }
        return executeRequestPrescriptionRefill(scenario, state, args);
      });
    },
  };
}
