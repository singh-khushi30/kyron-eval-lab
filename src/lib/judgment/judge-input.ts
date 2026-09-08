import type { AgentMessageEvent, Trace } from "@/lib/domain";
import {
  appointmentUnchanged,
  escalationEvents,
  lastToolResult,
} from "@/lib/eval/trace-view";
import {
  didTransactionalStateChange,
  isAppointmentState,
  isPrescriptionState,
} from "@/lib/simulation/state";
import type { ClarityJudgeInput } from "./types";

/**
 * Evidence-only payload for next_step_clarity.
 * Does not include human labels, expected scores, or scenario answer hints.
 */
export function buildClarityJudgeInput(
  trace: Trace,
  options?: { requiresEscalation?: boolean },
): ClarityJudgeInput {
  const tool = relevantTransactionalTool(trace);
  const escalations = escalationEvents(trace);
  const lastEscalation = escalations.at(-1);

  return {
    agentResponses: agentResponses(trace),
    transactionalCompletionOccurred: transactionalCompletionOccurred(trace),
    relevantTool: tool
      ? {
          name: tool.toolName,
          status: tool.status,
          ...(tool.errorMessage ? { errorMessage: tool.errorMessage } : {}),
        }
      : null,
    finalStateChanged: didTransactionalStateChange(
      trace.initialState,
      trace.finalState,
    ),
    escalationRequired: options?.requiresEscalation === true,
    escalationOccurred: escalations.length > 0,
    handoffContext: lastEscalation
      ? {
          destination: lastEscalation.destination,
          reason: lastEscalation.reason,
        }
      : null,
    requestContext: requestContext(trace),
  };
}

function agentResponses(trace: Trace): string[] {
  return trace.events
    .filter((event): event is AgentMessageEvent => event.type === "agent_message")
    .map((event) => event.content);
}

function relevantTransactionalTool(trace: Trace) {
  return (
    lastToolResult(trace, "reschedule_appointment") ??
    lastToolResult(trace, "request_refill")
  );
}

export function transactionalCompletionOccurred(trace: Trace): boolean {
  const reschedule = lastToolResult(trace, "reschedule_appointment");
  const refill = lastToolResult(trace, "request_refill");

  if (reschedule?.status === "success" && !appointmentUnchanged(trace)) {
    return true;
  }
  if (
    refill?.status === "success" &&
    isPrescriptionState(trace.finalState) &&
    trace.finalState.refill.status === "submitted"
  ) {
    return true;
  }
  return false;
}

function requestContext(trace: Trace): ClarityJudgeInput["requestContext"] {
  const state = trace.finalState;
  if (isAppointmentState(state)) {
    return {
      workflow: "appointment_reschedule",
      requestedSlotStartAt: state.requestedSlot.startAt,
    };
  }
  return {
    workflow: "prescription_refill",
    medication: state.medication.name,
    pharmacy: state.currentPharmacy.name,
  };
}
