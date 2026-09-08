import type { EvaluationResult } from "@/lib/domain";
import type { ClarityJudgment } from "@/lib/judgment";
import { METRIC_LABELS } from "@/lib/ui/format";
import { ScoreChip, StatusChip } from "./StatusChip";

export function EvaluationPanel({
  evaluations,
  overallPassed,
  keyFailure,
  clarity,
}: {
  evaluations: EvaluationResult[];
  overallPassed: boolean;
  keyFailure: EvaluationResult | null;
  clarity: ClarityJudgment;
}) {
  return (
    <section className="space-y-4">
      <div className="border border-line bg-card px-4 py-3">
        <h2 className="text-sm font-semibold">Evaluation results</h2>
        <p className="mt-1 text-xs text-muted">
          Overall: {overallPassed ? "Pass" : "Fail"}. Deterministic metrics are
          authoritative for tool/state facts. Next-step clarity is a judgment
          metric and does not override them.
        </p>
      </div>

      {!overallPassed && keyFailure ? (
        <div className="border border-red-800/20 bg-fail-bg px-4 py-3">
          <h3 className="text-sm font-semibold text-fail">Key failure</h3>
          <p className="mt-1 text-sm">
            {METRIC_LABELS[keyFailure.metric]}: {keyFailure.reason}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
            {keyFailure.evidence.map((item) => (
              <li key={item.detail}>{item.detail}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluations.map((result) => (
        <article key={result.metric} className="border border-line bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {METRIC_LABELS[result.metric]}
            </h3>
            <StatusChip passed={result.passed} />
          </div>
          <p className="mt-2 text-sm">{result.reason}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
            {result.evidence.map((item) => (
              <li key={item.detail}>
                {item.detail}
                {item.statePath ? ` [${item.statePath}]` : ""}
              </li>
            ))}
          </ul>
        </article>
      ))}

      <article className="border border-dashed border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Next-step clarity</h3>
          <ScoreChip score={clarity.score} max={2} />
        </div>
        <p className="mt-1 text-xs text-muted">
          Judgment metric (human-calibrated rubric v2). Not used for overall
          pass/fail.
        </p>
        <p className="mt-2 text-sm">{clarity.reason}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          {clarity.evidence.map((item) => (
            <li key={item.detail}>{item.detail}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
