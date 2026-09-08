import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvaluationSuite } from "../src/lib/eval/artifact";
import { compareEvaluationRuns } from "../src/lib/experiment/compare";
import { SCENARIOS } from "../src/lib/scenarios";
import { writeJsonArtifact } from "./write-artifact";

const artifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "v1-vs-v2-comparison.json",
);

const v1Runs = runEvaluationSuite("v1-naive");
const v2Runs = runEvaluationSuite("v2-safer");
const comparison = compareEvaluationRuns(v1Runs, v2Runs, SCENARIOS);
writeJsonArtifact(artifactPath, comparison);

console.log(
  `overall pass rate v1=${formatRate(comparison.overallScenarioPassRate.v1)} v2=${formatRate(comparison.overallScenarioPassRate.v2)}`,
);
for (const [metric, rate] of Object.entries(comparison.metricPassRates)) {
  console.log(
    `${metric} v1=${formatRate(rate.v1)} v2=${formatRate(rate.v2)}`,
  );
}
console.log(
  `false completion claims v1=${comparison.falseCompletionClaims.v1} v2=${comparison.falseCompletionClaims.v2}`,
);
console.log(
  `required escalations handled v1=${comparison.requiredEscalationsHandled.v1}/${comparison.requiredEscalationsHandled.required} v2=${comparison.requiredEscalationsHandled.v2}/${comparison.requiredEscalationsHandled.required}`,
);

for (const scenario of comparison.scenarios) {
  console.log(
    `${scenario.scenarioId} v1=${scenario.v1Overall ? "PASS" : "FAIL"} v2=${scenario.v2Overall ? "PASS" : "FAIL"} ${scenario.reason}`,
  );
}

if (comparison.regressions.length === 0) {
  console.log("\nNo regressions observed in this synthetic set.");
} else {
  console.log("\nRegressions:");
  for (const regression of comparison.regressions) {
    console.log(`- ${regression.scenarioId}: ${regression.reason}`);
  }
}

console.log(`\nWrote ${artifactPath}`);

function formatRate(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
