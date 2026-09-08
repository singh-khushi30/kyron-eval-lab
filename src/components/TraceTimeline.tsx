import type { ClinicState, Trace, TraceEvent } from "@/lib/domain";
import { prettyJson } from "@/lib/ui/format";
import { relevantStateSlice } from "@/lib/simulation/state";

const EVENT_LABEL: Record<TraceEvent["type"], string> = {
  caller_message: "Caller",
  agent_message: "Agent",
  tool_call: "Tool call",
  tool_result: "Tool result",
  state_change: "State change",
  escalation: "Escalation",
};

export function TraceTimeline({ trace }: { trace: Trace }) {
  return (
    <section className="border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Conversation + trace</h2>
        <p className="mt-1 text-xs text-muted">
          Chronological events. Tool results and state are ground truth for
          whether work completed.
        </p>
      </div>
      <ol className="divide-y divide-line">
        {trace.events.map((event) => (
          <li key={event.id} className="px-4 py-3">
            <div className="mb-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted">{event.id}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {EVENT_LABEL[event.type]}
              </span>
            </div>
            <EventBody event={event} />
          </li>
        ))}
      </ol>
      <StateSummary
        label="Initial state"
        state={trace.initialState}
      />
      <StateSummary label="Final state" state={trace.finalState} />
      <details className="border-t border-line px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Raw trace JSON</summary>
        <pre className="mt-2 overflow-x-auto font-mono text-xs text-muted">
          {prettyJson(trace)}
        </pre>
      </details>
    </section>
  );
}

function EventBody({ event }: { event: TraceEvent }) {
  if (event.type === "caller_message" || event.type === "agent_message") {
    return (
      <div>
        <p>{event.content}</p>
        {event.type === "agent_message" && event.claimsTaskComplete ? (
          <p className="mt-1 text-xs text-fail">
            Transcript claim: task complete (not ground truth)
          </p>
        ) : null}
      </div>
    );
  }

  if (event.type === "tool_call") {
    return (
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-mono">{event.toolName}</span>
        </p>
        <ArgumentList value={event.arguments} />
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Raw arguments</summary>
          <pre className="mt-1 overflow-x-auto font-mono text-muted">
            {prettyJson(event.arguments)}
          </pre>
        </details>
      </div>
    );
  }

  if (event.type === "tool_result") {
    return (
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-mono">{event.toolName}</span>{" "}
          <span className="font-medium uppercase">{event.status}</span>
        </p>
        {event.errorMessage ? (
          <p className="text-fail">{event.errorMessage}</p>
        ) : null}
        {event.payload ? <PayloadHighlights payload={event.payload} /> : null}
        {event.payload ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted">Raw result</summary>
            <pre className="mt-1 overflow-x-auto font-mono text-muted">
              {prettyJson(event.payload)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (event.type === "state_change") {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-mono text-xs">
          {event.path}: {summarizeValue(event.before)} →{" "}
          {summarizeValue(event.after)}
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Raw before / after</summary>
          <pre className="mt-1 overflow-x-auto font-mono text-muted">
            {prettyJson({ before: event.before, after: event.after })}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <p className="text-sm">
      To {event.destination}: {event.reason}
    </p>
  );
}

function ArgumentList({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }
  return (
    <dl className="grid gap-1 font-mono text-xs">
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt className="inline text-muted">{key}: </dt>
          <dd className="inline">{summarizeValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PayloadHighlights({ payload }: { payload: Record<string, unknown> }) {
  const keys = [
    "available",
    "appointmentId",
    "slotId",
    "medicationId",
    "pharmacyId",
    "refillId",
    "status",
    "errorCode",
    "destination",
  ];
  const shown = keys.filter((key) => payload[key] !== undefined);
  if (shown.length === 0) {
    return null;
  }
  return (
    <dl className="grid gap-1 font-mono text-xs">
      {shown.map((key) => (
        <div key={key}>
          <dt className="inline text-muted">{key}: </dt>
          <dd className="inline">{summarizeValue(payload[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function summarizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return prettyJson(value);
}

function StateSummary({
  label,
  state,
}: {
  label: string;
  state: ClinicState;
}) {
  const slice = relevantStateSlice(state);
  return (
    <div className="border-t border-line px-4 py-3 text-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </h3>
      <pre className="mt-1 font-mono text-xs">{prettyJson(slice)}</pre>
    </div>
  );
}
