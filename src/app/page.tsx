import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ScenarioTable } from "@/components/ScenarioTable";
import { SCENARIOS } from "@/lib/scenarios";
import { loadExperiment } from "@/lib/ui/data";
import { formatCountRate, formatPercent } from "@/lib/ui/format";

export default function OverviewPage() {
  const { v1Runs, v2Runs, comparison, calibrationV1, calibrationV2 } =
    loadExperiment();
  const overall = comparison.overallScenarioPassRate;

  return (
    <AppShell current="overview">
      <p className="text-xs uppercase tracking-wide text-muted">
        Healthcare Voice Agent Evaluation
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Evaluate whether an agent actually completed the work it claimed
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Evaluate whether an agent actually completed the work it claimed to
        complete, handled critical entities correctly, and escalated when
        required.
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Latest experiment: v1-naive vs v2-safer
          </h2>
          <Link href="/compare" className="text-sm underline underline-offset-2">
            Open full comparison
          </Link>
        </div>
        <p className="mt-2 border border-review-bg bg-review-bg px-3 py-2 text-sm text-review">
          Results reflect 8 deterministic synthetic scenarios and are
          regression evidence, not production prevalence.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="V1 overall"
            value={formatPercent(overall.v1)}
            detail={formatCountRate(overall.v1Count, overall.denominator)}
          />
          <SummaryCard
            label="V2 overall"
            value={formatPercent(overall.v2)}
            detail="8/8 in synthetic set"
          />
          <SummaryCard
            label="False completion claims"
            value={`${comparison.falseCompletionClaims.v1} → ${comparison.falseCompletionClaims.v2}`}
            detail="Ungrounded “you're all set” claims"
          />
          <SummaryCard
            label="Required escalations handled"
            value={`${comparison.requiredEscalationsHandled.v1}/${comparison.requiredEscalationsHandled.required} → ${comparison.requiredEscalationsHandled.v2}/${comparison.requiredEscalationsHandled.required}`}
            detail="RX-004 urgent-symptom case"
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">Scenario results</h2>
        <ScenarioTable
          scenarios={SCENARIOS}
          v1Runs={v1Runs}
          v2Runs={v2Runs}
          rows={comparison.scenarios}
        />
      </section>

      <section className="mt-10 border border-line bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Evaluator calibration</h2>
        <p className="mt-2 text-sm">
          Initial next-step-clarity evaluator:{" "}
          {calibrationV1.includingCalibrationExamples.exactAgreementCount}/
          {calibrationV1.includingCalibrationExamples.n} exact agreement
          including the boundary calibration example. Revised evaluator:{" "}
          {calibrationV2.includingCalibrationExamples.exactAgreementCount}/
          {calibrationV2.includingCalibrationExamples.n}.
        </p>
        <p className="mt-2 text-sm text-muted">
          The initial rubric over-rewarded “Someone will contact you.” Human
          label 1/2, evaluator v1 2/2. Full credit now requires a named owner
          plus a concrete action, or grounded handoff evidence. Seven labels
          are insufficient to establish evaluator reliability.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/compare" className="underline underline-offset-2">
            See calibration notes on Compare
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">What to inspect first</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>
            <Link href="/compare" className="underline underline-offset-2">
              Compare v1 vs v2
            </Link>
          </li>
          <li>
            <Link
              href="/runs/v1-naive/APT-003"
              className="underline underline-offset-2"
            >
              Open APT-003 v1
            </Link>
          </li>
          <li>
            <Link
              href="/runs/v2-safer/APT-003"
              className="underline underline-offset-2"
            >
              Compare it with APT-003 v2
            </Link>
          </li>
          <li>
            <Link
              href="/runs/v2-safer/RX-004"
              className="underline underline-offset-2"
            >
              Inspect RX-004 escalation
            </Link>
          </li>
          <li>
            Review the evaluator calibration example on Compare
          </li>
        </ol>
      </section>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border border-line bg-card px-4 py-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </h3>
      <p className="mt-1 font-mono text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  );
}
