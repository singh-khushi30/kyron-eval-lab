import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EvaluationPanel } from "@/components/EvaluationPanel";
import { HumanReviewCard } from "@/components/HumanReviewCard";
import { GroundTruth } from "@/components/GroundTruth";
import { StatusChip } from "@/components/StatusChip";
import { TraceTimeline } from "@/components/TraceTimeline";
import { AGENT_VERSIONS, loadRun } from "@/lib/ui/data";
import { workflowLabel } from "@/lib/ui/format";
import { SCENARIOS } from "@/lib/scenarios";

export function generateStaticParams() {
  return AGENT_VERSIONS.flatMap((agentVersion) =>
    SCENARIOS.map((scenario) => ({
      agentVersion,
      scenarioId: scenario.id,
    })),
  );
}

export default async function RunInspectorPage({
  params,
}: {
  params: Promise<{ agentVersion: string; scenarioId: string }>;
}) {
  const { agentVersion, scenarioId } = await params;
  const data = loadRun(agentVersion, scenarioId);
  if (!data) {
    notFound();
  }

  const { scenario, run, peerVersion, clarity, keyFailure } = data;

  return (
    <AppShell current="overview">
      <p className="text-xs uppercase tracking-wide text-muted">
        Run inspector
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {scenario.id}
          </h1>
          <p className="text-sm text-muted">{scenario.name}</p>
        </div>
        <StatusChip
          passed={run.overallPassed}
          label={run.overallPassed ? "Overall pass" : "Overall fail"}
        />
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Workflow
          </dt>
          <dd>{workflowLabel(scenario.workflow)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Agent version
          </dt>
          <dd className="font-mono">{run.agentVersion}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            Other version
          </dt>
          <dd>
            <Link
              href={`/runs/${peerVersion}/${scenario.id}`}
              className="underline underline-offset-2"
            >
              Open {peerVersion}
            </Link>
          </dd>
        </div>
      </dl>

      <div className="mt-8 space-y-6">
        <GroundTruth scenario={scenario} />
        <TraceTimeline trace={run.trace} />
        <EvaluationPanel
          evaluations={run.evaluations}
          overallPassed={run.overallPassed}
          keyFailure={keyFailure}
          clarity={clarity}
        />
        <HumanReviewCard
          key={`${run.agentVersion}:${scenario.id}`}
          agentVersion={run.agentVersion}
          scenarioId={scenario.id}
          overallPassed={run.overallPassed}
        />
      </div>
    </AppShell>
  );
}
