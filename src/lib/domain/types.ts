/**
 * Domain model for Kyron Eval Lab.
 *
 * Ground truth lives in scenario state and expectedOutcome — never in
 * transcript wording. An agent saying "you're all set" is a claim, not proof
 * that the appointment or refill actually changed.
 */

export const WORKFLOWS = {
  appointment_reschedule: "appointment_reschedule",
  prescription_refill: "prescription_refill",
} as const;

export type Workflow = (typeof WORKFLOWS)[keyof typeof WORKFLOWS];

export type Difficulty = "easy" | "medium" | "hard";

export type AgentVersion = "v1-naive" | "v2-safer";

/** Explicit tool outcomes. Timeouts are not failures and not successes. */
export type ToolStatus = "success" | "failure" | "timeout";

export type ToolName =
  | "check_slot_availability"
  | "reschedule_appointment"
  | "request_refill"
  | "change_pharmacy"
  | "escalate_to_clinician";

export type AppointmentStatus = "scheduled" | "rescheduled" | "cancelled";

export type RefillStatus = "not_requested" | "submitted" | "failed";

export type EscalationDestination = "clinician" | "nurse_line" | "pharmacist";

export interface Patient {
  id: string;
  /** Synthetic display label only. Never a real person. */
  displayName: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerName: string;
  locationName: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
}

export interface AppointmentSlot {
  id: string;
  providerName: string;
  locationName: string;
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface Medication {
  id: string;
  name: string;
  rxNumber: string;
  remainingRefills: number;
  lastFilledAt: string | null;
  eligibleForRefill: boolean;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface AppointmentClinicState {
  workflow: "appointment_reschedule";
  patient: Patient;
  currentAppointment: Appointment;
  /** Latest caller-requested slot. After a correction, this is the corrected time. */
  requestedSlot: AppointmentSlot;
  /** Earlier times the caller mentioned and then replaced. */
  supersededSlotRequests: AppointmentSlot[];
  availableSlots: AppointmentSlot[];
}

export interface PrescriptionClinicState {
  workflow: "prescription_refill";
  patient: Patient;
  medication: Medication;
  currentPharmacy: Pharmacy;
  /** Set when the caller asks to pick up at a different pharmacy. */
  requestedPharmacy: Pharmacy | null;
  refill: {
    status: RefillStatus;
    pharmacyId: string | null;
  };
  /** Out-of-scope clinical complaint, if the caller reported one. */
  reportedUrgentSymptom: string | null;
}

export type ClinicState = AppointmentClinicState | PrescriptionClinicState;

export interface AppointmentExpectedOutcome {
  workflow: "appointment_reschedule";
  completionAllowed: boolean;
  escalationRequired: boolean;
  /** Authoritative post-run appointment. Compare against finalState, not dialogue. */
  expectedAppointment: Appointment;
  requestedSlotShouldBeBooked: boolean;
}

export interface PrescriptionExpectedOutcome {
  workflow: "prescription_refill";
  completionAllowed: boolean;
  escalationRequired: boolean;
  refillSubmitted: boolean;
  expectedRefillStatus: RefillStatus;
  expectedPharmacyId: string;
}

export type ExpectedOutcome =
  | AppointmentExpectedOutcome
  | PrescriptionExpectedOutcome;

export interface CriticalEntities {
  patientId: string;
  appointmentId?: string;
  requestedSlotId?: string;
  correctedSlotId?: string;
  medicationId?: string;
  currentPharmacyId?: string;
  requestedPharmacyId?: string;
}

export interface ScriptedToolBehavior {
  outcome: ToolStatus;
  resultMessage: string;
  errorCode?: string;
  /**
   * When set, a successful outcome applies only if the tool call includes
   * these argument values. Used so corrections (latest intent) are checkable
   * in state rather than inferred from the transcript.
   */
  succeedsOnlyWhen?: Record<string, string>;
  /** Bookable alternatives when the requested entity is unavailable. */
  alternativeSlotIds?: string[];
}

export type ToolBehavior = Partial<Record<ToolName, ScriptedToolBehavior>>;

export interface Policy {
  /**
   * Completion claims are valid only when final clinic state matches
   * expectedOutcome. Transcript text is never treated as completion evidence.
   */
  requireStateConfirmedCompletion: boolean;
  mayOfferAlternativeSlots: boolean;
  mustEscalateForUrgentSymptoms: boolean;
  /** Ordinary workflow completion is forbidden even if tools would succeed. */
  forbidOrdinaryCompletion: boolean;
}

interface ScenarioBase {
  id: string;
  name: string;
  description: string;
  callerGoal: string;
  criticalEntities: CriticalEntities;
  toolBehavior: ToolBehavior;
  policy: Policy;
  requiresEscalation: boolean;
  intentionallyUnavailableEvidence: string[];
  difficulty: Difficulty;
}

export interface AppointmentScenario extends ScenarioBase {
  workflow: "appointment_reschedule";
  initialState: AppointmentClinicState;
  expectedOutcome: AppointmentExpectedOutcome;
}

export interface PrescriptionScenario extends ScenarioBase {
  workflow: "prescription_refill";
  initialState: PrescriptionClinicState;
  expectedOutcome: PrescriptionExpectedOutcome;
}

export type Scenario = AppointmentScenario | PrescriptionScenario;

export type TraceEventType =
  | "caller_message"
  | "agent_message"
  | "tool_call"
  | "tool_result"
  | "escalation"
  | "state_change";

interface TraceEventBase {
  id: string;
  type: TraceEventType;
  at: string;
}

export interface CallerMessageEvent extends TraceEventBase {
  type: "caller_message";
  content: string;
}

export interface AgentMessageEvent extends TraceEventBase {
  type: "agent_message";
  content: string;
  /** Spoken claim only. Not ground truth for whether the task completed. */
  claimsTaskComplete?: boolean;
}

export interface ToolCallEvent extends TraceEventBase {
  type: "tool_call";
  toolName: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResultEvent extends TraceEventBase {
  type: "tool_result";
  toolName: ToolName;
  status: ToolStatus;
  payload?: Record<string, unknown>;
  errorMessage?: string;
  /** Relevant clinic slice before the call. Ground truth, not transcript. */
  stateBefore?: unknown;
  /** Relevant clinic slice after the call. Unchanged on failure or timeout. */
  stateAfter?: unknown;
}

export interface EscalationEvent extends TraceEventBase {
  type: "escalation";
  reason: string;
  destination: EscalationDestination;
}

export interface StateChangeEvent extends TraceEventBase {
  type: "state_change";
  path: string;
  before: unknown;
  after: unknown;
}

export type TraceEvent =
  | CallerMessageEvent
  | AgentMessageEvent
  | ToolCallEvent
  | ToolResultEvent
  | EscalationEvent
  | StateChangeEvent;

export interface Trace {
  id: string;
  scenarioId: string;
  agentVersion: AgentVersion;
  startedAt: string;
  events: TraceEvent[];
  initialState: ClinicState;
  finalState: ClinicState;
}

export type EvaluationMetric =
  | "verified_task_completion"
  | "claim_grounding"
  | "critical_entity_accuracy"
  | "safety_escalation";

export interface EvaluationEvidence {
  eventIds?: string[];
  /** Path into clinic state, e.g. "refill.status" or "currentAppointment.startAt". */
  statePath?: string;
  /** Transcript excerpt if relevant. Never sufficient on its own for system success. */
  transcriptExcerpt?: string;
  detail: string;
}

export interface EvaluationResult {
  metric: EvaluationMetric;
  passed: boolean;
  score?: number;
  reason: string;
  evidence: EvaluationEvidence[];
}

export interface EvaluationRun {
  id: string;
  scenarioId: string;
  agentVersion: AgentVersion;
  trace: Trace;
  evaluations: EvaluationResult[];
  overallPassed: boolean;
}
