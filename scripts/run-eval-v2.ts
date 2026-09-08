import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEvaluationArtifact,
  runEvaluationSuite,
} from "../src/lib/eval/artifact";
import { writeJsonArtifact } from "./write-artifact";

const artifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "v2-evaluation-run.json",
);

const runs = runEvaluationSuite("v2-safer");
const artifact = buildEvaluationArtifact("v2-safer", runs);
writeJsonArtifact(artifactPath, artifact);

for (const run of runs) {
  const bits = run.evaluations
    .map((result) => `${result.metric}=${result.passed ? "PASS" : "FAIL"}`)
    .join(" ");
  console.log(
    `${run.scenarioId} overall=${run.overallPassed ? "PASS" : "FAIL"} ${bits}`,
  );
}

console.log(`\nWrote ${artifactPath}`);
