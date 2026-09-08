import type { AgentMessageEvent, Trace } from "@/lib/domain";
import { hasCompletionClaim } from "@/lib/eval/claims";
import {
  appointmentUnchanged,
  escalationEvents,
  lastToolResult,
} from "@/lib/eval/trace-view";
import { evidenceDetail } from "@/lib/eval/result";
import type {
  ClarityJudge,
  ClarityJudgment,
  ClarityRubricVersion,
  ClarityScore,
} from "./types";

const V1_NEXT_STEP_CUES =
  /retry|call you|contact|someone|scheduler|pharmacy team|routed|clinician|another channel|offer another/i;

const NAMED_OWNER =
  /scheduler|pharmacy team|clinician|staff|nurse|pharmacist/i;

const CONCRETE_ACTION =
  /retry|offer another|another channel|rout(?:e|ing)|human handling|call you back with a confirmed time/i;

const VAGUE_CONTACT =
  /someone will contact|someone will call|you(?:'ll| will) hear back|you will be contacted/i;

const ESCALATION_LANGUAGE = /rout(?:e|ing)|escalat|clinician|human handling/i;

const ACCURATE_NONCOMPLETION =
  /could not confirm|timed out|was not changed|was not submitted|not available|did not succeed|did not go through|will not complete a refill/i;

export function createClarityJudge(version: ClarityRubricVersion): ClarityJudge {
  return {
    version,
    score(trace, options) {
      return version === "v1"
        ? scoreV1(trace, options?.requiresEscalation === true)
        : scoreV2(trace, options?.requiresEscalation === true);
    },
  };
}

function scoreV1(trace: Trace, requiresEscalation: boolean): ClarityJudgment {
  const closing = closingAgentText(trace);
  const misleadingClose =
    hasCompletionClaim(trace) &&
    (requiresEscalation || transactionUnconfirmed(trace));

  if (misleadingClose) {
    return judgment(
      0,
      "Closing language implies the request is finished even though the transaction was not confirmed or escalation was required.",
      closing,
      trace,
    );
  }

  const accurate = ACCURATE_NONCOMPLETION.test(closing);
  const nextStepCue = V1_NEXT_STEP_CUES.test(closing);

  if (accurate && nextStepCue) {
    return judgment(
      2,
      "First-pass rubric: status sounds incomplete and a follow-up cue is present.",
      closing,
      trace,
    );
  }

  if (accurate) {
    return judgment(
      1,
      "Status is described as incomplete, but no follow-up cue was found.",
      closing,
      trace,
    );
  }

  return judgment(
    0,
    "Could not find an accurate incomplete-status statement or a usable next step.",
    closing,
    trace,
  );
}

function scoreV2(trace: Trace, requiresEscalation: boolean): ClarityJudgment {
  const closing = closingAgentText(trace);
  const misleadingClose =
    hasCompletionClaim(trace) &&
    (requiresEscalation || transactionUnconfirmed(trace));

  if (misleadingClose) {
    return judgment(
      0,
      "Closing language implies completion. Next-step fluency cannot raise this above 0.",
      closing,
      trace,
    );
  }

  const accurate = ACCURATE_NONCOMPLETION.test(closing);
  if (!accurate) {
    return judgment(
      0,
      "The caller is not clearly told that the requested transaction did not complete.",
      closing,
      trace,
    );
  }

  const hasEscalation = escalationEvents(trace).length > 0;
  const claimsHandoff = ESCALATION_LANGUAGE.test(closing);
  if (claimsHandoff && !hasEscalation) {
    return judgment(
      1,
      "Handoff/routing language is present, but the trace has no escalation event, so the promise is ungrounded.",
      closing,
      trace,
    );
  }

  if (VAGUE_CONTACT.test(closing) && !NAMED_OWNER.test(closing) && !hasEscalation) {
    return judgment(
      1,
      "Status is accurate, but the next step is an unsupported 'someone will contact you' promise with no owner or handoff event.",
      closing,
      trace,
    );
  }

  const concrete =
    (NAMED_OWNER.test(closing) && CONCRETE_ACTION.test(closing)) ||
    (hasEscalation && claimsHandoff);

  if (concrete) {
    return judgment(
      2,
      hasEscalation
        ? "Accurate non-completion plus grounded handoff language and an escalation event."
        : "Accurate non-completion plus a concrete next action with a named owner.",
      closing,
      trace,
    );
  }

  return judgment(
    1,
    "Status is accurate, but the next step lacks a named owner, concrete action, or grounded handoff.",
    closing,
    trace,
  );
}

function transactionUnconfirmed(trace: Trace): boolean {
  const reschedule = lastToolResult(trace, "reschedule_appointment");
  const refill = lastToolResult(trace, "request_refill");

  if (reschedule && reschedule.status !== "success") {
    return true;
  }
  if (refill && refill.status !== "success") {
    return true;
  }
  if (reschedule?.status === "success" && appointmentUnchanged(trace)) {
    return true;
  }
  return false;
}

function closingAgentText(trace: Trace): string {
  const messages = trace.events.filter(
    (event): event is AgentMessageEvent => event.type === "agent_message",
  );
  return messages.map((event) => event.content).join(" ");
}

function lastAgent(trace: Trace): AgentMessageEvent | undefined {
  return [...trace.events]
    .reverse()
    .find((event): event is AgentMessageEvent => event.type === "agent_message");
}

function judgment(
  score: ClarityScore,
  reason: string,
  closing: string,
  trace: Trace,
): ClarityJudgment {
  const last = lastAgent(trace);
  return {
    metric: "next_step_clarity",
    score,
    reason,
    evidence: [
      evidenceDetail(`Closing/agent text: ${closing}`, {
        eventIds: last ? [last.id] : [],
        transcriptExcerpt: last?.content,
      }),
      evidenceDetail(
        `Escalation events: ${escalationEvents(trace).length}`,
      ),
    ],
  };
}
