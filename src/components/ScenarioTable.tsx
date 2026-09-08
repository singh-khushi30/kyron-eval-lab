import Link from "next/link";
import type { ScenarioComparison } from "@/lib/experiment/compare";
import type { EvaluationRun, Scenario } from "@/lib/domain";
import { METRIC_LABELS, workflowLabel } from "@/lib/ui/format";
import { StatusChip } from "./StatusChip";

export function ScenarioTable({
  scenarios,
  v1Runs,
  v2Runs,
  rows,
}: {
  scenarios: Scenario[];
  v1Runs: EvaluationRun[];
  v2Runs: EvaluationRun[];
  rows: ScenarioComparison[];
}) {
  return (
    <div className="overflow-x-auto border border-line bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">
          Scenario results for v1-naive and v2-safer
        </caption>
        <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Scenario</th>
            <th className="px-3 py-2 font-medium">Workflow</th>
            <th className="px-3 py-2 font-medium">Difficulty</th>
            <th className="px-3 py-2 font-medium">v1</th>
            <th className="px-3 py-2 font-medium">v2</th>
            <th className="px-3 py-2 font-medium">Changed metrics</th>
            <th className="px-3 py-2 font-medium">Inspect</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => {
            const row = rows.find((item) => item.scenarioId === scenario.id);
            const improved = row && !row.v1Overall && row.v2Overall;
            return (
              <tr
                key={scenario.id}
                className={
                  improved
                    ? "border-b border-line bg-pass-bg/40 last:border-0"
                    : "border-b border-line last:border-0"
                }
              >
                <td className="px-3 py-3">
                  <div className="font-mono text-xs">{scenario.id}</div>
                  <div className="text-muted">{scenario.name}</div>
                  {improved ? (
                    <div className="mt-1 text-xs text-pass">Improved in v2</div>
                  ) : null}
                </td>
                <td className="px-3 py-3">{workflowLabel(scenario.workflow)}</td>
                <td className="px-3 py-3 capitalize">{scenario.difficulty}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/runs/v1-naive/${scenario.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    <StatusChip passed={row?.v1Overall === true} />
                    <span className="sr-only"> Open {scenario.id} v1</span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/runs/v2-safer/${scenario.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    <StatusChip passed={row?.v2Overall === true} />
                    <span className="sr-only"> Open {scenario.id} v2</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-xs text-muted">
                  {row?.metricsChanged.length
                    ? row.metricsChanged
                        .map(
                          (change) =>
                            `${METRIC_LABELS[change.metric]}: ${change.v1 ? "Pass" : "Fail"} → ${change.v2 ? "Pass" : "Fail"}`,
                        )
                        .join("; ")
                    : "None"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    <Link
                      className="underline underline-offset-2"
                      href={`/runs/v1-naive/${scenario.id}`}
                    >
                      v1 trace
                    </Link>
                    <Link
                      className="underline underline-offset-2"
                      href={`/runs/v2-safer/${scenario.id}`}
                    >
                      v2 trace
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sr-only">
        {v1Runs.length} v1 runs and {v2Runs.length} v2 runs are listed above.
      </p>
    </div>
  );
}
