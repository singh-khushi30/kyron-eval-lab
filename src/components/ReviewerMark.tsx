"use client";

import { useState } from "react";

type Mark = "unset" | "agree" | "review";

export function ReviewerMark() {
  const [mark, setMark] = useState<Mark>("unset");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">Local reviewer mark</span>
      <button
        type="button"
        onClick={() => setMark("agree")}
        className={
          mark === "agree"
            ? "border border-green-800 bg-pass-bg px-2 py-1 text-pass"
            : "border border-line bg-card px-2 py-1 text-muted hover:text-ink"
        }
      >
        Agree
      </button>
      <button
        type="button"
        onClick={() => setMark("review")}
        className={
          mark === "review"
            ? "border border-amber-800 bg-review-bg px-2 py-1 text-review"
            : "border border-line bg-card px-2 py-1 text-muted hover:text-ink"
        }
      >
        Override / Needs review
      </button>
      {mark !== "unset" ? (
        <span className="text-muted">
          {mark === "agree" ? "Marked: Agree" : "Marked: Needs review"} (not saved)
        </span>
      ) : null}
    </div>
  );
}
