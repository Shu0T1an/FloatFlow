export function formatTimestamp(timestamp: string): string {
  const asNumber = Number(timestamp);
  const parsed = Number.isNaN(asNumber) ? new Date(timestamp) : new Date(asNumber * 1000);

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
