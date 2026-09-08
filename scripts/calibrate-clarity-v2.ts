import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calibrateClarity } from "../src/lib/judgment/calibrate";
import { writeJsonArtifact } from "./write-artifact";

const artifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "clarity-calibration-v2.json",
);

const artifact = calibrateClarity("v2");
writeJsonArtifact(artifactPath, artifact);

console.log("Clarity calibration v2");
console.log(
  `experiment traces: agreement ${artifact.experimentTraces.exactAgreementCount}/${artifact.experimentTraces.n} (${pct(artifact.experimentTraces.exactAgreementRate)}) MAE=${artifact.experimentTraces.meanAbsoluteError}`,
);
console.log(
  `including calibration examples: agreement ${artifact.includingCalibrationExamples.exactAgreementCount}/${artifact.includingCalibrationExamples.n} (${pct(artifact.includingCalibrationExamples.exactAgreementRate)}) MAE=${artifact.includingCalibrationExamples.meanAbsoluteError}`,
);
for (const row of artifact.rows) {
  const mark = row.agreed ? "AGREE" : "DISAGREE";
  console.log(
    `${row.id} [${row.kind}] human=${row.humanScore} eval=${row.evaluatorScore} ${mark}`,
  );
}
console.log(`\nWrote ${artifactPath}`);

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
