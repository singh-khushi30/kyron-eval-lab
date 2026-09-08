import type {
  AgentVersion,
  ClinicState,
  EscalationDestination,
  ToolName,
  ToolStatus,
  Trace,
  TraceEvent,
} from "@/lib/domain";
import { cloneState } from "./state";

const TRACE_CLOCK_START_MS = Date.parse("2026-09-08T18:00:00.000Z");

export interface AgentMessageOptions {
  claimsTaskComplete?: boolean;
}

export class TraceRecorder {
  private readonly events: TraceEvent[] = [];
  private sequence = 0;
  private clockTick = 0;

  constructor(
    private readonly scenarioId: string,
    private readonly agentVersion: AgentVersion,
    private readonly startedAt: string,
    private readonly initialState: ClinicState,
  ) {}

  caller(content: string): void {
    this.push({
      id: this.nextId(),
      type: "caller_message",
      at: this.nextTime(),
      content,
    });
  }

  agent(content: string, options: AgentMessageOptions = {}): void {
    this.push({
      id: this.nextId(),
      type: "agent_message",
      at: this.nextTime(),
      content,
      ...(options.claimsTaskComplete !== undefined
        ? { claimsTaskComplete: options.claimsTaskComplete }
        : {}),
    });
  }

  toolCall(toolName: ToolName, args: Record<string, unknown>): void {
    this.push({
      id: this.nextId(),
      type: "tool_call",
      at: this.nextTime(),
      toolName,
      arguments: args,
    });
  }

  toolResult(input: {
    toolName: ToolName;
    status: ToolStatus;
    payload?: Record<string, unknown>;
    errorMessage?: string;
    stateBefore?: unknown;
    stateAfter?: unknown;
  }): void {
    this.push({
      id: this.nextId(),
      type: "tool_result",
      at: this.nextTime(),
      toolName: input.toolName,
      status: input.status,
      ...(input.payload ? { payload: input.payload } : {}),
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
      ...(input.stateBefore !== undefined
        ? { stateBefore: input.stateBefore }
        : {}),
      ...(input.stateAfter !== undefined ? { stateAfter: input.stateAfter } : {}),
    });
  }

  stateChange(path: string, before: unknown, after: unknown): void {
    this.push({
      id: this.nextId(),
      type: "state_change",
      at: this.nextTime(),
      path,
      before,
      after,
    });
  }

  escalation(reason: string, destination: EscalationDestination): void {
    this.push({
      id: this.nextId(),
      type: "escalation",
      at: this.nextTime(),
      reason,
      destination,
    });
  }

  finalize(finalState: ClinicState): Trace {
    return {
      id: `trace_${this.scenarioId}_${this.agentVersion}`,
      scenarioId: this.scenarioId,
      agentVersion: this.agentVersion,
      startedAt: this.startedAt,
      events: this.events,
      initialState: cloneState(this.initialState),
      finalState: cloneState(finalState),
    };
  }

  private push(event: TraceEvent): void {
    this.events.push(event);
  }

  private nextId(): string {
    this.sequence += 1;
    return `evt_${String(this.sequence).padStart(3, "0")}`;
  }

  private nextTime(): string {
    const at = new Date(TRACE_CLOCK_START_MS + this.clockTick * 1000).toISOString();
    this.clockTick += 1;
    return at;
  }
}

export function createTraceRecorder(
  scenarioId: string,
  agentVersion: AgentVersion,
  initialState: ClinicState,
): TraceRecorder {
  return new TraceRecorder(
    scenarioId,
    agentVersion,
    new Date(TRACE_CLOCK_START_MS).toISOString(),
    cloneState(initialState),
  );
}
