export type ReviewDecision = "agree" | "needs_review";

export interface HumanReview {
  agentVersion: string;
  scenarioId: string;
  decision: ReviewDecision;
  note: string;
  updatedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
