"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReviewDecision } from "@/lib/review";
import {
  getReviewSnapshot,
  parseHumanReview,
  saveHumanReview,
  subscribeReviews,
} from "@/lib/review";
import { StatusChip } from "./StatusChip";

export function HumanReviewCard({
  agentVersion,
  scenarioId,
  overallPassed,
}: {
  agentVersion: string;
  scenarioId: string;
  overallPassed: boolean;
}) {
  const raw = useSyncExternalStore(
    subscribeReviews,
    () => getReviewSnapshot(agentVersion, scenarioId),
    () => null,
  );
  const saved = parseHumanReview(raw);
  const [draft, setDraft] = useState<{
    decision: ReviewDecision | null;
    note: string;
  } | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const decision = draft ? draft.decision : (saved?.decision ?? null);
  const note = draft ? draft.note : (saved?.note ?? "");

  function updateDraft(next: { decision: ReviewDecision | null; note: string }) {
    setDraft(next);
    setJustSaved(false);
  }

  function handleSave() {
    if (!decision) {
      return;
    }

    const written = saveHumanReview({
      agentVersion,
      scenarioId,
      decision,
      note,
      updatedAt: new Date().toISOString(),
    });
    if (!written) {
      return;
    }

    setDraft(null);
    setJustSaved(true);
  }

  return (
    <section className="border border-line bg-card px-4 py-4">
      <h2 className="text-sm font-semibold">Human review</h2>
      <p className="mt-1 text-xs text-muted">
        Stored in this browser only (localStorage). Reviews are an annotation
        and do not change the automated evaluation. Production would use
        authenticated server persistence and audit history.
      </p>

      <dl className="mt-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="text-xs uppercase tracking-wide text-muted">
            Automated result
          </dt>
          <dd>
            <StatusChip
              passed={overallPassed}
              label={overallPassed ? "Pass" : "Fail"}
            />
          </dd>
        </div>
      </dl>

      <fieldset className="mt-4">
        <legend className="text-xs uppercase tracking-wide text-muted">
          Reviewer decision
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <DecisionButton
            selected={decision === "agree"}
            onClick={() => updateDraft({ decision: "agree", note })}
          >
            Agree
          </DecisionButton>
          <DecisionButton
            selected={decision === "needs_review"}
            tone="review"
            onClick={() => updateDraft({ decision: "needs_review", note })}
          >
            Needs review
          </DecisionButton>
        </div>
      </fieldset>

      <label className="mt-4 block text-sm">
        <span className="text-xs uppercase tracking-wide text-muted">
          Optional note
        </span>
        <textarea
          value={note}
          onChange={(event) =>
            updateDraft({ decision, note: event.target.value })
          }
          rows={3}
          className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!decision}
          className="border border-ink bg-ink px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted"
        >
          Save review
        </button>
        {justSaved ? (
          <span className="text-xs text-pass">Saved locally</span>
        ) : null}
        {saved?.updatedAt ? (
          <span className="text-xs text-muted">
            Last updated {formatUpdatedAt(saved.updatedAt)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function DecisionButton({
  selected,
  tone = "agree",
  onClick,
  children,
}: {
  selected: boolean;
  tone?: "agree" | "review";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const selectedClass =
    tone === "review"
      ? "border border-amber-800 bg-review-bg px-3 py-1.5 text-sm text-review"
      : "border border-green-800 bg-pass-bg px-3 py-1.5 text-sm text-pass";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? selectedClass
          : "border border-line bg-card px-3 py-1.5 text-sm text-muted hover:text-ink"
      }
    >
      {children}
    </button>
  );
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
