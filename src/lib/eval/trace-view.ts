import type {
  EscalationEvent,
  Scenario,
  ToolName,
  ToolResultEvent,
  Trace,
} from "@/lib/domain";
import {
  isAppointmentState,
  isPrescriptionState,
  relevantStateSlice,
} from "@/lib/simulation/state";

export function toolResults(trace: Trace, toolName?: ToolName): ToolResultEvent[] {
  return trace.events.filter(
    (event): event is ToolResultEvent =>
      event.type === "tool_result" &&
      (toolName === undefined || event.toolName === toolName),
  );
}

export function lastToolResult(
  trace: Trace,
  toolName: ToolName,
): ToolResultEvent | undefined {
  return toolResults(trace, toolName).at(-1);
}

export function lastToolCallArgs(
  trace: Trace,
  toolName: ToolName,
): Record<string, unknown> | undefined {
  const event = [...trace.events]
    .reverse()
    .find((item) => item.type === "tool_call" && item.toolName === toolName);

  return event?.type === "tool_call" ? event.arguments : undefined;
}

export function escalationEvents(trace: Trace): EscalationEvent[] {
  return trace.events.filter(
    (event): event is EscalationEvent => event.type === "escalation",
  );
}

export function transactionalCompletionExpected(scenario: Scenario): boolean {
  return (
    !scenario.requiresEscalation && scenario.expectedOutcome.completionAllowed
  );
}

export function formatStateSlice(trace: Trace): string {
  return JSON.stringify(relevantStateSlice(trace.finalState));
}

export function appointmentUnchanged(trace: Trace): boolean {
  if (
    !isAppointmentState(trace.initialState) ||
    !isAppointmentState(trace.finalState)
  ) {
    return false;
  }

  return (
    JSON.stringify(trace.initialState.currentAppointment) ===
    JSON.stringify(trace.finalState.currentAppointment)
  );
}

export function refillSubmitted(trace: Trace): boolean {
  return (
    isPrescriptionState(trace.finalState) &&
    trace.finalState.refill.status === "submitted"
  );
}

export function describeTool(event: ToolResultEvent | undefined, label: string): string {
  if (!event) {
    return `${label}: not called`;
  }

  return `${label}: ${event.status}${event.errorMessage ? ` (${event.errorMessage})` : ""}`;
}
