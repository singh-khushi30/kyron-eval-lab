import type { ScriptedToolBehavior, ToolName, ToolStatus } from "@/lib/domain";
import type { Scenario } from "@/lib/domain";

export function getScriptedBehavior(
  scenario: Scenario,
  toolName: ToolName,
): ScriptedToolBehavior | undefined {
  return scenario.toolBehavior[toolName];
}

export function asToolArgs(args: object): Record<string, unknown> {
  return { ...args } as Record<string, unknown>;
}

export function argumentsSatisfy(
  args: object,
  required?: Record<string, string>,
): boolean {
  if (!required) {
    return true;
  }

  const record = asToolArgs(args);
  return Object.entries(required).every(
    ([key, value]) => String(record[key]) === value,
  );
}

/**
 * Resolve the scenario's scripted outcome. Timeout and failure always win
 * and never depend on later state mutation. Success can still be withheld
 * when succeedsOnlyWhen does not match the call arguments.
 */
export function resolveScriptedStatus(
  behavior: ScriptedToolBehavior | undefined,
  args: object,
): { status: ToolStatus; errorCode?: string; message?: string } | null {
  if (!behavior) {
    return null;
  }

  if (behavior.outcome === "timeout") {
    return {
      status: "timeout",
      errorCode: behavior.errorCode,
      message: behavior.resultMessage,
    };
  }

  if (behavior.outcome === "failure") {
    return {
      status: "failure",
      errorCode: behavior.errorCode,
      message: behavior.resultMessage,
    };
  }

  if (!argumentsSatisfy(args, behavior.succeedsOnlyWhen)) {
    return {
      status: "failure",
      errorCode: "ARGUMENT_MISMATCH",
      message: "Tool arguments did not match the scenario's success condition.",
    };
  }

  return {
    status: "success",
    message: behavior.resultMessage,
  };
}
