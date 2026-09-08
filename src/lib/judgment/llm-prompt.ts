import type { ClarityJudgeInput } from "./types";

export const LLM_CLARITY_EVALUATOR_VERSION = "llm-clarity-v1";

export const LLM_CLARITY_SYSTEM_PROMPT = `You score next-step clarity for a healthcare voice agent.

This is a communication metric only. Structured transactional facts are provided as evidence. Do not invent tools, state changes, callbacks, or handoffs that are not in the evidence.

Use this 0–2 rubric:

0 = Misleading or unclear
- false completion
- hides known failure/uncertainty
- no usable next step

1 = Partially clear
- accurately states incomplete status
- but the next step is vague, unowned, or unsupported

2 = Clear
- accurately states what happened
- AND provides a concrete next step
- full credit for routing/handoff requires grounded handoff evidence (an actual escalation event plus preserved request context), not polite language alone

Important boundary:
A vague, unowned future promise is not equivalent to a concrete grounded next step.
The sentence "The refill did not go through. Someone will contact you." must not automatically receive 2. If there is no named owner, no concrete action, and no handoff event, do not award 2.

Do not invent evidence that a callback or handoff exists.

Return only JSON with this schema:
{"score":0|1|2,"reason":"short explanation","evidence":["short evidence item"]}`;

export function formatLlmClarityUserPrompt(input: ClarityJudgeInput): string {
  return [
    "Score next-step clarity from this evidence only.",
    "Do not assume labels or expected scores.",
    JSON.stringify(input),
  ].join("\n");
}

export function buildLlmClarityMessages(input: ClarityJudgeInput): Array<{
  role: "system" | "user";
  content: string;
}> {
  return [
    { role: "system", content: LLM_CLARITY_SYSTEM_PROMPT },
    { role: "user", content: formatLlmClarityUserPrompt(input) },
  ];
}
