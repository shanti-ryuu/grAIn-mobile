export function getListData<T>(value: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

export function getPaginationTotal(value: { pagination?: { total?: number } } | unknown, fallback: number): number {
  if (
    value &&
    typeof value === "object" &&
    "pagination" in value &&
    typeof (value as { pagination?: { total?: unknown } }).pagination?.total === "number"
  ) {
    return (value as { pagination: { total: number } }).pagination.total;
  }

  return fallback;
}

export function relativeTime(value?: string | number | Date | null): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClock(value?: string | number | Date): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function sessionProgress(startMoisture: number, currentMoisture: number, targetMoisture = 14): number {
  const denominator = startMoisture - targetMoisture;
  if (denominator <= 0) {
    return currentMoisture <= targetMoisture ? 100 : 0;
  }

  return clampPercent(((startMoisture - currentMoisture) / denominator) * 100);
}
