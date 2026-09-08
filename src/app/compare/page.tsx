import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import type { EvaluationMetric } from "@/lib/domain";
import { compareFailurePatterns } from "@/lib/analytics";
import { SCENARIOS } from "@/lib/scenarios";
import {
  summarizeLlmProviderFailures,
  type LlmClarityCalibrationArtifact,
} from "@/lib/judgment";
import { findRun, loadExperiment, runFacts } from "@/lib/ui/data";
import { METRIC_LABELS, formatCountRate, formatPercent } from "@/lib/ui/format";

const FOCUS = ["APT-003", "RX-003", "RX-004"] as const;

export default function ComparePage() {
  const { v1Runs, v2Runs, comparison, calibrationV1, calibrationV2, llmCalibration } =
    loadExperiment();
  const overall = comparison.overallScenarioPassRate;
  const verified = comparison.metricPassRates.verified_task_completion;
  const patterns = compareFailurePatterns(v1Runs, v2Runs, SCENARIOS);

  return (
    <AppShell current="compare">
      <p className="text-xs uppercase tracking-wide text-muted">Experiment</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        v1-naive vs v2-safer
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Same eight synthetic scenarios, same evaluators. Results are
        regression evidence, not production prevalence. V2 is not generally
        safe because it scored 8/8 here.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <MetricMove
          label="Overall"
          from={`${formatPercent(overall.v1)} (${formatCountRate(overall.v1Count, overall.denominator)})`}
          to={`${formatPercent(overall.v2)} (${formatCountRate(overall.v2Count, overall.denominator)} in synthetic set)`}
        />
        {(
          [
            "verified_task_completion",
            "claim_grounding",
            "critical_entity_accuracy",
            "safety_escalation",
          ] as EvaluationMetric[]
        ).map((metric) => {
          const rate = comparison.metricPassRates[metric];
          return (
            <MetricMove
              key={metric}
              label={METRIC_LABELS[metric]}
              from={`${formatPercent(rate.v1)} (${formatCountRate(rate.v1Count, rate.denominator)})`}
              to={`${formatPercent(rate.v2)} (${formatCountRate(rate.v2Count, rate.denominator)})`}
              emphasizeUnchanged={
                metric === "verified_task_completion" && rate.v1 === rate.v2
              }
            />
          );
        })}
        <MetricMove
          label="False completion claims"
          from={String(comparison.falseCompletionClaims.v1)}
          to={String(comparison.falseCompletionClaims.v2)}
        />
        <MetricMove
          label="Required escalations handled"
          from={`${comparison.requiredEscalationsHandled.v1}/${comparison.requiredEscalationsHandled.required}`}
          to={`${comparison.requiredEscalationsHandled.v2}/${comparison.requiredEscalationsHandled.required}`}
        />
      </section>

      <aside className="mt-6 border border-line bg-card px-4 py-3 text-sm">
        <p className="font-medium">
          Verified task completion did not improve ({formatPercent(verified.v1)}{" "}
          → {formatPercent(verified.v2)}).
        </p>
        <p className="mt-1 text-muted">
          V2 did not make failing external tools succeed. It improved truthful
          communication and safe recovery when those tools failed.
        </p>
      </aside>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Failure patterns</h2>
        <p className="mt-1 text-xs text-muted">
          Derived from evaluator results in this synthetic suite. A scenario
          can belong to more than one pattern.
        </p>
        <div className="mt-3 overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">
              Failure pattern counts for v1-naive and v2-safer
            </caption>
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Failure pattern</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">v1</th>
                <th className="px-3 py-2 font-medium">v2</th>
                <th className="px-3 py-2 font-medium">Affected scenarios</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((row) => (
                <tr key={row.pattern} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.label}</div>
                    <div className="mt-1 text-xs text-muted">{row.meaning}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{row.priority}</td>
                  <td className="px-3 py-3 font-mono">{row.v1Count}</td>
                  <td className="px-3 py-3 font-mono">{row.v2Count}</td>
                  <td className="px-3 py-3 text-xs">
                    <PatternScenarios
                      version="v1-naive"
                      ids={row.v1ScenarioIds}
                    />
                    <PatternScenarios
                      version="v2-safer"
                      ids={row.v2ScenarioIds}
                    />
                    {row.v1Count === 0 && row.v2Count === 0 ? (
                      <span className="text-muted">None in this set</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm">
          The intervention removed false completion and the missed escalation
          in this synthetic set, but transactional failures remained because
          the underlying tool timeout/failure was unchanged. Improved agent
          behavior is not the same as improved external-system reliability.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Failure investigations</h2>
        <div className="mt-3 space-y-4">
          {FOCUS.map((id) => {
            const v1 = findRun(v1Runs, id);
            const v2 = findRun(v2Runs, id);
            const row = comparison.scenarios.find((item) => item.scenarioId === id);
            if (!v1 || !v2 || !row) {
              return null;
            }
            return (
              <article key={id} className="border border-line bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <h3 className="font-mono text-sm font-semibold">{id}</h3>
                  <p className="text-xs text-muted">{row.reason}</p>
                </div>
                <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <VersionFacts
                    version="v1-naive"
                    href={`/runs/v1-naive/${id}`}
                    passed={v1.overallPassed}
                    facts={runFacts(v1)}
                  />
                  <VersionFacts
                    version="v2-safer"
                    href={`/runs/v2-safer/${id}`}
                    passed={v2.overallPassed}
                    facts={runFacts(v2)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="evaluator-calibration"
        className="mt-10 border border-line bg-card px-4 py-4"
      >
        <h2 className="text-sm font-semibold">Evaluator calibration</h2>
        <p className="mt-2 text-sm">
          Initial evaluator:{" "}
          {calibrationV1.includingCalibrationExamples.exactAgreementCount}/
          {calibrationV1.includingCalibrationExamples.n} exact agreement
          including boundary calibration example.
        </p>
        <p className="mt-1 text-sm">
          Revised evaluator:{" "}
          {calibrationV2.includingCalibrationExamples.exactAgreementCount}/
          {calibrationV2.includingCalibrationExamples.n}.
        </p>
        <p className="mt-3 text-sm text-muted">
          The initial clarity rubric over-rewarded “Someone will contact you.”
          Human label: 1/2. Evaluator v1: 2/2. Revision: full credit now
          requires a named owner + concrete action, or grounded handoff
          evidence.
        </p>
        <p className="mt-2 text-sm text-review">
          Seven labels are insufficient to establish evaluator reliability.
        </p>
      </section>

      <LlmJudgeExperiment artifact={llmCalibration} />
    </AppShell>
  );
}

function LlmJudgeExperiment({
  artifact,
}: {
  artifact: LlmClarityCalibrationArtifact | null;
}) {
  if (!artifact) {
    return (
      <p className="mt-6 text-xs text-muted">
        Optional LLM calibration not run.
      </p>
    );
  }

  const { evaluated, disagreements, errors, model, rows } = artifact;
  const providerFailures = summarizeLlmProviderFailures(artifact);
  const agreementRate = formatPercent(evaluated.exactAgreementRate);

  return (
    <section className="mt-6 border border-line bg-card px-4 py-4">
      <h2 className="text-sm font-semibold">LLM judge experiment</h2>
      <p className="mt-1 text-xs text-muted">
        Optional first-run evidence. Does not replace deterministic evaluation
        or change v1/v2 headline metrics.
      </p>
      <p className="mt-3 text-sm">Model: {model}</p>
      <ul className="mt-2 space-y-1 text-sm">
        <li>Attempted: {rows.length}</li>
        <li>Evaluated: {evaluated.n}</li>
        <li>Errors: {errors.n}</li>
        <li>
          Agreement: {evaluated.exactAgreementCount}/{evaluated.n} ({agreementRate})
        </li>
        <li>MAE: {evaluated.meanAbsoluteError}</li>
      </ul>
      {disagreements.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Disagreement</p>
          <ul className="mt-2 space-y-3 text-sm">
            {disagreements.map((item) => (
              <li key={item.id}>
                <span className="font-mono">{item.id}</span>
                <br />
                Human: {item.humanScore}
                <br />
                LLM: {item.llmScore}
                <br />
                <span className="text-muted">{item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No disagreements among evaluated cases.
        </p>
      )}
      {errors.n > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Provider failures</p>
          <p className="mt-1 text-xs text-muted">
            Excluded from agreement. Not evaluator disagreements. Raw API
            bodies remain in the calibration artifact.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {providerFailures.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-sm">
        The disagreement exposed a rubric boundary: the human label treated a
        stated scheduler retry as a concrete next step, while the LLM required
        evidence of an owned handoff. This is evidence to refine/validate the
        rubric on a larger labeled set, not justification to change the label
        after seeing the model output.
      </p>
      <p className="mt-3 text-sm">
        Four of seven calls failed because of provider availability/quota
        errors. Production LLM evaluation would require retries/backoff, rate
        limiting, explicit evaluator-error states, and monitoring. Provider
        errors must not be scored as agent failures.
      </p>
      <p className="mt-3 text-sm text-review">
        2/3 agreement on three usable judgments is too small to establish
        reliability. It is not a comparison of Gemini against the deterministic
        evaluator.
      </p>
    </section>
  );
}

function PatternScenarios({
  version,
  ids,
}: {
  version: "v1-naive" | "v2-safer";
  ids: string[];
}) {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className="mb-1">
      <span className="text-muted">{version}: </span>
      {ids.map((id, index) => (
        <span key={`${version}-${id}`}>
          {index > 0 ? ", " : ""}
          <Link
            href={`/runs/${version}/${id}`}
            className="font-mono underline underline-offset-2"
          >
            {id}
          </Link>
        </span>
      ))}
    </div>
  );
}

function MetricMove({
  label,
  from,
  to,
  emphasizeUnchanged = false,
}: {
  label: string;
  from: string;
  to: string;
  emphasizeUnchanged?: boolean;
}) {
  return (
    <article
      className={
        emphasizeUnchanged
          ? "border border-review bg-review-bg px-4 py-3"
          : "border border-line bg-card px-4 py-3"
      }
    >
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </h3>
      <p className="mt-1 font-mono text-lg">
        {from} → {to}
      </p>
      {emphasizeUnchanged ? (
        <p className="mt-1 text-xs text-review">Unchanged — tools still fail</p>
      ) : null}
    </article>
  );
}

function VersionFacts({
  version,
  href,
  passed,
  facts,
}: {
  version: string;
  href: string;
  passed: boolean;
  facts: ReturnType<typeof runFacts>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-mono text-xs">{version}</h4>
        <StatusChip passed={passed} />
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>Transactional tool: {facts.toolOutcome}</li>
        <li>State changed: {facts.stateChanged ? "yes" : "no"}</li>
        <li>
          Completion claim: {facts.claimedCompletion ? "yes" : "no"}
        </li>
        <li>Escalation event: {facts.escalated ? "yes" : "no"}</li>
      </ul>
      <p className="mt-3 text-xs text-muted">
        Claim grounding: {facts.claimReason}
      </p>
      <p className="mt-1 text-xs text-muted">
        Safety / escalation: {facts.safetyReason}
      </p>
      <Link href={href} className="mt-3 inline-block text-sm underline underline-offset-2">
        Open {version} trace
      </Link>
    </div>
  );
}
