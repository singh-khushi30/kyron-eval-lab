import { SCENARIOS } from "../src/lib/scenarios";
import {
  formatRunSummary,
  runScenario,
  summarizeTrace,
} from "../src/lib/simulation";

for (const scenario of SCENARIOS) {
  const trace = runScenario(scenario.id, "v1-naive");
  console.log(formatRunSummary(summarizeTrace(trace)));
  console.log("");
}
