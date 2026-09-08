import type { AgentMessageEvent, Trace } from "@/lib/domain";

/**
 * Explicit completion phrases used by the scripted harness.
 * Transcript matches are claims only — never proof the task completed.
 */
export const COMPLETION_CLAIM_PATTERNS: RegExp[] = [
  /you'?re all set/i,
  /has been rescheduled/i,
  /appointment is now/i,
  /successfully rescheduled/i,
  /submitted the refill/i,
  /refill request has been submitted/i,
];

export function messageClaimsCompletion(event: AgentMessageEvent): boolean {
  if (event.claimsTaskComplete) {
    return true;
  }

  return COMPLETION_CLAIM_PATTERNS.some((pattern) => pattern.test(event.content));
}

export function completionClaimMessages(trace: Trace): AgentMessageEvent[] {
  return trace.events.filter(
    (event): event is AgentMessageEvent =>
      event.type === "agent_message" && messageClaimsCompletion(event),
  );
}

export function hasCompletionClaim(trace: Trace): boolean {
  return completionClaimMessages(trace).length > 0;
}
