import type { HumanReview, ReviewDecision, StorageLike } from "./types";

const listeners = new Set<() => void>();

export function subscribeReviews(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

function notifyReviews() {
  for (const listener of listeners) {
    listener();
  }
}

export function getReviewSnapshot(
  agentVersion: string,
  scenarioId: string,
): string | null {
  const storage = browserStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(reviewStorageKey(agentVersion, scenarioId));
  } catch {
    return null;
  }
}

export function reviewStorageKey(
  agentVersion: string,
  scenarioId: string,
): string {
  return `kyron-review:${agentVersion}:${scenarioId}`;
}

export function serializeHumanReview(review: HumanReview): string {
  return JSON.stringify(review);
}

export function parseHumanReview(raw: string | null): HumanReview | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!isHumanReview(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function loadHumanReview(
  agentVersion: string,
  scenarioId: string,
  storage: StorageLike | null = browserStorage(),
): HumanReview | null {
  if (!storage) {
    return null;
  }

  try {
    return parseHumanReview(storage.getItem(reviewStorageKey(agentVersion, scenarioId)));
  } catch {
    return null;
  }
}

export function saveHumanReview(
  review: HumanReview,
  storage: StorageLike | null = browserStorage(),
): HumanReview | null {
  if (!storage) {
    return null;
  }

  try {
    storage.setItem(reviewStorageKey(review.agentVersion, review.scenarioId), serializeHumanReview(review));
    notifyReviews();
    return review;
  } catch {
    return null;
  }
}

export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isHumanReview(value: unknown): value is HumanReview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.agentVersion === "string" &&
    record.agentVersion.length > 0 &&
    typeof record.scenarioId === "string" &&
    record.scenarioId.length > 0 &&
    isReviewDecision(record.decision) &&
    typeof record.note === "string" &&
    typeof record.updatedAt === "string" &&
    record.updatedAt.length > 0
  );
}

function isReviewDecision(value: unknown): value is ReviewDecision {
  return value === "agree" || value === "needs_review";
}
