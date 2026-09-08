/** Deterministic clock label for synthetic appointment times. */
export function formatSlotClock(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/Los_Angeles",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
  return `${weekday} at ${time}`;
}
