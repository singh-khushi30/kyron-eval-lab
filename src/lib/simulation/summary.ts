import type { ToolName, ToolStatus, Trace } from "@/lib/domain";
import { didTransactionalStateChange } from "./state";

const TRANSACTION_TOOLS: ToolName[] = [
  "reschedule_appointment",
  "request_refill",
];

export interface RunSummary {
  scenarioId: string;
  finalStateChanged: boolean;
  toolOutcome: ToolStatus | "none";
  agentClaimedCompletion: boolean;
}

export function summarizeTrace(trace: Trace): RunSummary {
  const primary = [...trace.events]
    .reverse()
    .find(
      (event) =>
        event.type === "tool_result" &&
        TRANSACTION_TOOLS.includes(event.toolName),
    );

  const preferred =
    primary && primary.type === "tool_result"
      ? primary
      : [...trace.events]
          .reverse()
          .find((event) => event.type === "tool_result");

  return {
    scenarioId: trace.scenarioId,
    finalStateChanged: didTransactionalStateChange(
      trace.initialState,
      trace.finalState,
    ),
    toolOutcome:
      preferred && preferred.type === "tool_result" ? preferred.status : "none",
    agentClaimedCompletion: trace.events.some(
      (event) => event.type === "agent_message" && event.claimsTaskComplete,
    ),
  };
}

export function formatRunSummary(summary: RunSummary): string {
  return [
    summary.scenarioId,
    `final state changed: ${summary.finalStateChanged ? "yes" : "no"}`,
    `tool outcome: ${summary.toolOutcome}`,
    `agent claimed completion: ${summary.agentClaimedCompletion ? "yes" : "no"}`,
  ].join("\n");
}
