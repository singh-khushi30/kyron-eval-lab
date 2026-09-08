import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Scenario, Trace } from "@/lib/domain";
import { getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import type { ClarityLabelFile, ManualClarityLabel } from "./types";

const LABEL_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../data/manual-labels/next-step-clarity.json",
);

export function loadClarityLabels(): ClarityLabelFile {
  return JSON.parse(readFileSync(LABEL_PATH, "utf8")) as ClarityLabelFile;
}

export function resolveLabeledTrace(label: ManualClarityLabel): {
  trace: Trace;
  scenario: Scenario | undefined;
} {
  if (label.kind === "calibration_example") {
    if (!label.embeddedTrace) {
      throw new Error(`Calibration example ${label.id} is missing embeddedTrace`);
    }
    return { trace: label.embeddedTrace, scenario: undefined };
  }

  if (label.agentVersion === "calibration") {
    throw new Error(`Experiment label ${label.id} has a calibration agent version`);
  }

  const scenario = getScenarioById(label.scenarioId);
  const trace = runScenario(label.scenarioId, label.agentVersion);
  return { trace, scenario };
}
