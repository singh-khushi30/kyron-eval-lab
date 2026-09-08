import type { AgentVersion, Trace } from "@/lib/domain";
import { getScenarioById } from "@/lib/scenarios";
import { runV1Naive } from "./agents/v1-naive";
import { runV2Safer } from "./agents/v2-safer";
import { createTraceRecorder } from "./recorder";
import { cloneState } from "./state";
import { createFakeTools } from "./tools";

export function runScenario(
  scenarioId: string,
  agentVersion: AgentVersion,
): Trace {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  const initialState = cloneState(scenario.initialState);
  const workingState = cloneState(scenario.initialState);
  const recorder = createTraceRecorder(
    scenario.id,
    agentVersion,
    initialState,
  );
  const tools = createFakeTools(scenario, workingState, recorder);

  if (agentVersion === "v1-naive") {
    runV1Naive(scenario, tools, recorder);
  } else if (agentVersion === "v2-safer") {
    runV2Safer(scenario, tools, recorder, workingState);
  } else {
    throw new Error(`Agent version "${agentVersion}" is not implemented.`);
  }

  return recorder.finalize(workingState);
}
