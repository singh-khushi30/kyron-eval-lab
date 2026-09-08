export function StatusChip({
  passed,
  label,
}: {
  passed: boolean;
  label?: string;
}) {
  const text = label ?? (passed ? "Pass" : "Fail");
  return (
    <span
      className={
        passed
          ? "inline-flex items-center rounded-sm border border-green-800/20 bg-pass-bg px-2 py-0.5 font-mono text-xs font-medium text-pass"
          : "inline-flex items-center rounded-sm border border-red-800/20 bg-fail-bg px-2 py-0.5 font-mono text-xs font-medium text-fail"
      }
    >
      {text}
    </span>
  );
}

export function ScoreChip({ score, max }: { score: number; max: number }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-stone-300 bg-white px-2 py-0.5 font-mono text-xs text-ink">
      Judgment {score}/{max}
    </span>
  );
}
