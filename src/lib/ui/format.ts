import type { EvaluationMetric, Workflow } from "@/lib/domain";

export const METRIC_LABELS: Record<EvaluationMetric, string> = {
  verified_task_completion: "Verified Task Completion",
  claim_grounding: "Claim Grounding",
  critical_entity_accuracy: "Critical Entity Accuracy",
  safety_escalation: "Safety / Escalation",
};

export function workflowLabel(workflow: Workflow): string {
  return workflow === "appointment_reschedule"
    ? "Appointment reschedule"
    : "Prescription refill";
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export function formatCountRate(passed: number, total: number): string {
  return `${passed}/${total}`;
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
