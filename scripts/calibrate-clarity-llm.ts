import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calibrateClarityLlm } from "../src/lib/judgment/calibrate-llm";
import { isLlmConfigured, readLlmEnv } from "../src/lib/judgment/llm-env";
import { loadLlmEnvFile } from "./load-llm-env";
import { writeJsonArtifact } from "./write-artifact";

loadLlmEnvFile();

const artifactPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "clarity-calibration-llm.json",
);

if (!isLlmConfigured()) {
  console.log("Optional LLM calibration skipped: LLM_API_KEY is not set.");
  console.log(
    "Copy .env.example to .env and set LLM_API_KEY, LLM_MODEL, and optional LLM_BASE_URL.",
  );
  console.log("The rest of the lab does not require an API key.");
  process.exit(0);
}

void main();

async function main(): Promise<void> {
  const config = readLlmEnv();
  const artifact = await calibrateClarityLlm(config);

  writeJsonArtifact(artifactPath, artifact);

  console.log("Optional LLM clarity calibration");
  console.log(`model: ${artifact.model}`);
  console.log(`evaluator: ${artifact.evaluatorVersion}`);
  console.log(
    `evaluated: ${artifact.evaluated.n}  agreement ${artifact.evaluated.exactAgreementCount}/${artifact.evaluated.n} (${pct(artifact.evaluated.exactAgreementRate)}) MAE=${artifact.evaluated.meanAbsoluteError}`,
  );
  if (artifact.errors.n > 0) {
    console.log(
      `errors (excluded from agreement): ${artifact.errors.n} [${artifact.errors.caseIds.join(", ")}]`,
    );
  }
  for (const row of artifact.rows) {
    if (row.error) {
      console.log(`${row.id} ERROR ${row.error.code}: ${row.error.reason}`);
      continue;
    }
    const mark = row.agreed ? "AGREE" : "DISAGREE";
    console.log(
      `${row.id} [${row.kind}] human=${row.humanScore} llm=${row.llmScore} ${mark}`,
    );
  }
  if (artifact.disagreements.length > 0) {
    console.log("\nDisagreements:");
    for (const item of artifact.disagreements) {
      console.log(
        `${item.id} human=${item.humanScore} llm=${item.llmScore} ${item.reason}`,
      );
    }
  }
  console.log(`\nWrote ${artifactPath}`);
}

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
