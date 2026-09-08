import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getScenarioById } from "@/lib/scenarios";
import { runScenario } from "@/lib/simulation";
import { createEvaluationRun } from "@/lib/eval";
import type { StorageLike } from "./types";
import {
  loadHumanReview,
  parseHumanReview,
  reviewStorageKey,
  saveHumanReview,
  serializeHumanReview,
} from "./storage";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

describe("human review storage", () => {
  it("uses separate keys for agentVersion and scenarioId", () => {
    assert.equal(
      reviewStorageKey("v1-naive", "APT-003"),
      "kyron-review:v1-naive:APT-003",
    );
    assert.equal(
      reviewStorageKey("v2-safer", "APT-003"),
      "kyron-review:v2-safer:APT-003",
    );
    assert.notEqual(
      reviewStorageKey("v1-naive", "APT-003"),
      reviewStorageKey("v2-safer", "APT-003"),
    );
    assert.notEqual(
      reviewStorageKey("v1-naive", "APT-003"),
      reviewStorageKey("v1-naive", "RX-003"),
    );

    const storage = memoryStorage();
    saveHumanReview(
      {
        agentVersion: "v1-naive",
        scenarioId: "APT-003",
        decision: "needs_review",
        note: "v1 note",
        updatedAt: "2026-09-08T20:00:00.000Z",
      },
      storage,
    );
    saveHumanReview(
      {
        agentVersion: "v2-safer",
        scenarioId: "APT-003",
        decision: "agree",
        note: "v2 note",
        updatedAt: "2026-09-08T20:01:00.000Z",
      },
      storage,
    );

    assert.equal(loadHumanReview("v1-naive", "APT-003", storage)?.note, "v1 note");
    assert.equal(loadHumanReview("v2-safer", "APT-003", storage)?.decision, "agree");
  });

  it("handles malformed stored data safely", () => {
    assert.equal(parseHumanReview(null), null);
    assert.equal(parseHumanReview(""), null);
    assert.equal(parseHumanReview("{"), null);
    assert.equal(parseHumanReview("[]"), null);
    assert.equal(parseHumanReview('"agree"'), null);
    assert.equal(
      parseHumanReview(
        JSON.stringify({
          agentVersion: "v1-naive",
          scenarioId: "APT-003",
          decision: "override",
          note: "",
          updatedAt: "2026-09-08T20:00:00.000Z",
        }),
      ),
      null,
    );

    const storage = memoryStorage({
      "kyron-review:v1-naive:APT-003": "not-json",
    });
    assert.equal(loadHumanReview("v1-naive", "APT-003", storage), null);
  });

  it("serializes and deserializes a valid review", () => {
    const review = {
      agentVersion: "v1-naive",
      scenarioId: "APT-003",
      decision: "needs_review" as const,
      note: "Tool timeout handling should be reviewed before release.",
      updatedAt: "2026-09-08T20:00:00.000Z",
    };

    const parsed = parseHumanReview(serializeHumanReview(review));
    assert.deepEqual(parsed, review);

    const storage = memoryStorage();
    const saved = saveHumanReview(review, storage);
    assert.deepEqual(saved, review);
    assert.deepEqual(loadHumanReview("v1-naive", "APT-003", storage), review);
  });

  it("cannot modify evaluator results", () => {
    const scenario = getScenarioById("APT-003");
    assert.ok(scenario);
    const trace = runScenario("APT-003", "v1-naive");
    const before = createEvaluationRun(scenario, trace);

    const storage = memoryStorage();
    saveHumanReview(
      {
        agentVersion: "v1-naive",
        scenarioId: "APT-003",
        decision: "agree",
        note: "Human annotation only.",
        updatedAt: "2026-09-08T20:00:00.000Z",
      },
      storage,
    );

    const after = createEvaluationRun(scenario, trace);
    assert.equal(before.overallPassed, false);
    assert.equal(after.overallPassed, false);
    assert.deepEqual(after.evaluations, before.evaluations);
    assert.equal(loadHumanReview("v1-naive", "APT-003", storage)?.decision, "agree");
  });
});
