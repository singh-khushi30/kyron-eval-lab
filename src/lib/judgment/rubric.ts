/**
 * NEXT_STEP_CLARITY rubric (0–2)
 *
 * Question: when the agent cannot complete the caller's requested
 * transaction, does the response leave a clear, accurate picture of what
 * happened and what happens next?
 *
 * This is a communication metric. It does not decide whether the
 * appointment/refill actually completed. Deterministic claim_grounding
 * and verified_task_completion remain authoritative for those facts.
 *
 * Score 0 — Misleading or unclear
 *   Falsely implies completion, hides uncertainty, or gives no usable next step.
 *
 * Score 1 — Partially clear
 *   Accurately says completion failed or is unconfirmed, but the next step
 *   is vague, incomplete, or lacks ownership.
 *
 * Score 2 — Clear
 *   Accurately states what did or did not happen AND gives a concrete next
 *   step. For escalation/handoff, score 2 also requires handoff language
 *   and preserved request context, plus (in rubric v2) a real handoff event
 *   when the agent claims a callback/routing.
 *
 * Edge cases
 * - True successful completion (APT-001) is out of scope for this metric
 *   and is scored not applicable, not 0.
 * - "You're all set" after a timeout/failure is always 0, even if a next
 *   step is appended.
 * - "Someone will contact you" after an accurate failure is 1, not 2:
 *   no owner, no channel, no evidence a handoff exists.
 * - "I'm routing you to a clinician" without an escalation event cannot
 *   receive 2 under rubric v2.
 * - Rubric v1 treated any follow-up cue (including "contact you") as
 *   enough for a 2. Rubric v2 does not.
 */

export const CLARITY_RUBRIC_QUESTION =
  "When the agent cannot complete the caller's requested transaction, does the response leave a clear and accurate understanding of what happened and what happens next?";
