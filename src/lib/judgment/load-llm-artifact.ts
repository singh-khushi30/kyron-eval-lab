import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LlmClarityCalibrationArtifact } from "./types";

const ARTIFACT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../artifacts/clarity-calibration-llm.json",
);

export function llmCalibrationArtifactPath(): string {
  return ARTIFACT_PATH;
}

export function summarizeLlmProviderFailures(
  artifact: LlmClarityCalibrationArtifact,
): string[] {
  let highDemand = 0;
  let quota = 0;
  let other = 0;

  for (const row of artifact.rows) {
    if (!row.error) {
      continue;
    }
    const text = `${row.error.reason}\n${row.rawModelResponse ?? ""}`;
    if (/HTTP 503|high demand|UNAVAILABLE/i.test(text)) {
      highDemand += 1;
    } else if (/HTTP 429|quota|RESOURCE_EXHAUSTED/i.test(text)) {
      quota += 1;
    } else {
      other += 1;
    }
  }

  const lines: string[] = [];
  if (highDemand > 0) {
    lines.push(
      `${highDemand} HTTP 503 high-demand failure${highDemand === 1 ? "" : "s"}`,
    );
  }
  if (quota > 0) {
    lines.push(
      `${quota} HTTP 429 quota failure${quota === 1 ? "" : "s"}`,
    );
  }
  if (other > 0) {
    lines.push(`${other} other provider error${other === 1 ? "" : "s"}`);
  }
  return lines;
}

/** Build-time / server-only. Never fetch an LLM from the browser. */
export function loadLlmCalibrationArtifact(): LlmClarityCalibrationArtifact | null {
  if (!existsSync(ARTIFACT_PATH)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as Partial<
      LlmClarityCalibrationArtifact
    >;
    if (parsed.id !== "clarity-calibration-llm" || parsed.judge !== "llm") {
      return null;
    }
    if (!parsed.model || !parsed.evaluated || !Array.isArray(parsed.rows)) {
      return null;
    }
    return parsed as LlmClarityCalibrationArtifact;
  } catch {
    return null;
  }
}
