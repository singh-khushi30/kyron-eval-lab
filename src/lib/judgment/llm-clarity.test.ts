import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import { calibrateClarity } from "./calibrate";
import { createClarityJudge } from "./deterministic-clarity";
import { buildClarityJudgeInput } from "./judge-input";
import { resolveLabeledTrace, loadClarityLabels } from "./labels";
import { calibrateClarityLlm } from "./calibrate-llm";
import { createLlmClarityJudge, scoreLlmClarity } from "./llm-clarity";
import { isLlmConfigured, readLlmEnv } from "./llm-env";
import { isClarityJudgeError, parseLlmClarityResponse } from "./llm-parse";
import { buildLlmClarityMessages } from "./llm-prompt";
import type { LlmJudgeConfig } from "./llm-env";

const CONFIG: LlmJudgeConfig = {
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://llm.example.test/v1",
  timeoutMs: 1_000,
};

function openaiJson(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("LLM clarity response parsing", () => {
  it("parses a structured 0/1/2 response", () => {
    for (const score of [0, 1, 2] as const) {
      const parsed = parseLlmClarityResponse(
        JSON.stringify({
          score,
          reason: `score ${score}`,
          evidence: ["closing text"],
        }),
      );
      assert.equal(parsed.ok, true);
      if (parsed.ok) {
        assert.equal(parsed.judgment.score, score);
        assert.equal(parsed.judgment.reason, `score ${score}`);
        assert.equal(parsed.judgment.evidence[0]?.detail, "closing text");
      }
    }
  });

  it("rejects an invalid score", () => {
    const parsed = parseLlmClarityResponse(
      JSON.stringify({ score: 3, reason: "too high", evidence: [] }),
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, "invalid_score");
    }
  });

  it("handles malformed JSON as an evaluator error", () => {
    const parsed = parseLlmClarityResponse("not-json {");
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, "malformed_json");
    }
  });

  it("handles empty responses as an evaluator error", () => {
    const parsed = parseLlmClarityResponse("   ");
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, "empty_response");
    }
  });

  it("accepts JSON wrapped in a markdown fence", () => {
    const parsed = parseLlmClarityResponse(
      '```json\n{"score":1,"reason":"partial","evidence":["unowned promise"]}\n```',
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.judgment.score, 1);
    }
  });
});

describe("optional LLM judge", () => {
  it("treats missing API configuration as an evaluator error", async () => {
    let fetchCalled = false;
    const attempt = await scoreLlmClarity(
      runScenario("APT-003", "v2-safer"),
      { requiresEscalation: false },
      { ...CONFIG, apiKey: undefined },
      async () => {
        fetchCalled = true;
        return openaiJson("{}");
      },
    );
    assert.equal(fetchCalled, false);
    assert.equal(isClarityJudgeError(attempt.result), true);
    if (isClarityJudgeError(attempt.result)) {
      assert.equal(attempt.result.code, "missing_config");
    }
  });

  it("represents API/network errors as evaluator errors, not scores", async () => {
    const judge = createLlmClarityJudge(CONFIG, async () => {
      throw new TypeError("fetch failed");
    });
    const result = await judge.score(runScenario("APT-003", "v1-naive"), {
      requiresEscalation: false,
    });
    assert.equal(isClarityJudgeError(result), true);
    if (isClarityJudgeError(result)) {
      assert.equal(result.code, "api_error");
    }
    assert.equal("score" in result, false);
  });

  it("represents non-2xx responses as evaluator errors", async () => {
    const result = await createLlmClarityJudge(CONFIG, async () => {
      return new Response("unavailable", { status: 503 });
    }).score(runScenario("RX-003", "v2-safer"));
    assert.equal(isClarityJudgeError(result), true);
    if (isClarityJudgeError(result)) {
      assert.equal(result.code, "http_error");
    }
  });

  it("does not send human labels in the API request body", async () => {
    const label = loadClarityLabels().labels.find((item) => item.id === "CAL-001");
    assert.ok(label);
    const { trace, scenario } = resolveLabeledTrace(label);
    let body = "";
    await scoreLlmClarity(
      trace,
      { requiresEscalation: scenario?.requiresEscalation === true },
      CONFIG,
      async (_url, init) => {
        body = String(init.body);
        return openaiJson(
          JSON.stringify({
            score: 1,
            reason: "unowned promise",
            evidence: ["someone will contact you"],
          }),
        );
      },
    );
    assert.match(body, /Someone will contact you/);
    assert.doesNotMatch(body, /humanScore|humanRationale|Human = 1/i);
    assert.equal(body.includes(label.rationale), false);
  });

  it("does not include the human label in judge input or prompt", () => {
    const labels = loadClarityLabels();
    for (const label of labels.labels) {
      const { trace, scenario } = resolveLabeledTrace(label);
      const input = buildClarityJudgeInput(trace, {
        requiresEscalation: scenario?.requiresEscalation === true,
      });
      const serialized = JSON.stringify({
        input,
        messages: buildLlmClarityMessages(input),
      });

      assert.equal("humanScore" in input, false);
      assert.doesNotMatch(serialized, /humanScore|humanRationale|human label/i);
      assert.equal(serialized.includes(label.rationale), false);
      assert.equal(serialized.includes(`"humanScore":${label.humanScore}`), false);
    }
  });

  it("reports a calibration case error separately from agreement", async () => {
    const artifact = await calibrateClarityLlm(CONFIG, async () => {
      throw new TypeError("fetch failed");
    });
    assert.equal(artifact.evaluated.n, 0);
    assert.equal(artifact.evaluated.exactAgreementCount, 0);
    assert.equal(artifact.errors.n, loadClarityLabels().labels.length);
    assert.ok(artifact.errors.caseIds.includes("CAL-001"));
    assert.equal(artifact.disagreements.length, 0);
  });

  it("existing deterministic judge still works", () => {
    const judge = createClarityJudge("v2");
    const scenario = getScenarioById("APT-003");
    assert.ok(scenario);
    assert.equal(
      judge.score(runScenario("APT-003", "v1-naive"), {
        requiresEscalation: scenario.requiresEscalation,
      }).score,
      0,
    );
    assert.equal(
      judge.score(runScenario("APT-003", "v2-safer"), {
        requiresEscalation: scenario.requiresEscalation,
      }).score,
      2,
    );
    assert.equal(calibrateClarity("v1").includingCalibrationExamples.exactAgreementCount, 6);
    assert.equal(calibrateClarity("v2").includingCalibrationExamples.exactAgreementCount, 7);
  });

  it("readLlmEnv does not invent a key", () => {
    const env = readLlmEnv({ LLM_MODEL: "demo-model" });
    assert.equal(env.apiKey, undefined);
    assert.equal(env.model, "demo-model");
    assert.equal(isLlmConfigured({}), false);
  });
});
