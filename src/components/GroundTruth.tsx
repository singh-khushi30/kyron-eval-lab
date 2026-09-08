import type { Scenario } from "@/lib/domain";

export function GroundTruth({ scenario }: { scenario: Scenario }) {
  return (
    <section className="border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Scenario / ground truth</h2>
        <p className="mt-1 text-xs text-muted">
          Structured expected outcome and tool behavior are ground truth.
          Transcript wording is not.
        </p>
      </div>
      <dl className="grid gap-4 px-4 py-4 text-sm md:grid-cols-2">
        <Item label="Caller goal">{scenario.callerGoal}</Item>
        <Item label="Requires escalation">
          {scenario.requiresEscalation ? "Yes" : "No"}
        </Item>
        <Item label="Completion allowed">
          {scenario.expectedOutcome.completionAllowed ? "Yes" : "No"}
        </Item>
        <Item label="Expected outcome">
          {scenario.workflow === "appointment_reschedule" ? (
            <span>
              Appointment {scenario.expectedOutcome.expectedAppointment.startAt}{" "}
              ({scenario.expectedOutcome.expectedAppointment.status}); book
              requested slot:{" "}
              {scenario.expectedOutcome.requestedSlotShouldBeBooked
                ? "yes"
                : "no"}
            </span>
          ) : (
            <span>
              Refill submitted:{" "}
              {scenario.expectedOutcome.refillSubmitted ? "yes" : "no"}; status{" "}
              {scenario.expectedOutcome.expectedRefillStatus}; pharmacy{" "}
              {scenario.expectedOutcome.expectedPharmacyId}
            </span>
          )}
        </Item>
        <Item label="Critical entities">
          <pre className="font-mono text-xs whitespace-pre-wrap">
            {Object.entries(scenario.criticalEntities)
              .filter(([, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")}
          </pre>
        </Item>
        <Item label="Scripted tool behavior">
          <pre className="font-mono text-xs whitespace-pre-wrap">
            {Object.entries(scenario.toolBehavior)
              .map(
                ([name, behavior]) =>
                  `${name}: ${behavior?.outcome}${behavior?.errorCode ? ` (${behavior.errorCode})` : ""}`,
              )
              .join("\n")}
          </pre>
        </Item>
      </dl>
    </section>
  );
}

function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
