import type { Scenario } from "@/lib/domain";
import { APPOINTMENT_SCENARIOS } from "./appointments";
import { PRESCRIPTION_SCENARIOS } from "./prescriptions";

export const SCENARIOS: Scenario[] = [
  ...APPOINTMENT_SCENARIOS,
  ...PRESCRIPTION_SCENARIOS,
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

export { APPOINTMENT_SCENARIOS, PRESCRIPTION_SCENARIOS };
