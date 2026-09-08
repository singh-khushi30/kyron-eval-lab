import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calibrateClarity } from "../src/lib/judgment/calibrate";
import { writeJsonArtifact } from "./write-artifact";

const artifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "clarity-calibration-v1.json",
);

const artifact = calibrateClarity("v1");
writeJsonArtifact(artifactPath, artifact);

printCalibration("v1", artifact);
console.log(`\nWrote ${artifactPath}`);

function printCalibration(
  version: string,
  result: ReturnType<typeof calibrateClarity>,
): void {
  console.log(`Clarity calibration ${version}`);
  console.log(
    `experiment traces: agreement ${result.experimentTraces.exactAgreementCount}/${result.experimentTraces.n} (${pct(result.experimentTraces.exactAgreementRate)}) MAE=${result.experimentTraces.meanAbsoluteError}`,
  );
  console.log(
    `including calibration examples: agreement ${result.includingCalibrationExamples.exactAgreementCount}/${result.includingCalibrationExamples.n} (${pct(result.includingCalibrationExamples.exactAgreementRate)}) MAE=${result.includingCalibrationExamples.meanAbsoluteError}`,
  );
  for (const row of result.rows) {
    const mark = row.agreed ? "AGREE" : "DISAGREE";
    console.log(
      `${row.id} [${row.kind}] human=${row.humanScore} eval=${row.evaluatorScore} ${mark}`,
    );
  }
}

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
