import { Theme } from "@/utils/theme";

export type TimestampPoint = { timestamp: string };

export function uniqueChronologicalPoints<T extends TimestampPoint>(points: T[]): T[] {
  const seen = new Set<number>();
  return [...points]
    .filter((point) => {
      const timestamp = new Date(point.timestamp).getTime();
      if (!Number.isFinite(timestamp) || seen.has(timestamp)) {
        return false;
      }
      seen.add(timestamp);
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function sparseClockLabels(points: { timestamp: string }[], maxLabels = 5): string[] {
  const stride = Math.max(1, Math.ceil(points.length / maxLabels));
  let previous = "";

  return points.map((point, index) => {
    if (index % stride !== 0 && index !== points.length - 1) {
      return "";
    }

    const label = new Date(point.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (label === previous) {
      return "";
    }
    previous = label;
    return label;
  });
}

export function chartConfig(theme: Theme, color: string) {
  return {
    backgroundGradientFrom: theme.bgCard,
    backgroundGradientTo: theme.bgCard,
    color: (opacity = 1) => colorWithOpacity(color, opacity),
    decimalPlaces: 1,
    labelColor: (opacity = 1) => colorWithOpacity(theme.textSecondary, opacity),
    propsForBackgroundLines: {
      stroke: theme.border,
      strokeDasharray: "4 8",
      strokeOpacity: 0.65,
    },
    propsForDots: { r: "3", stroke: color, strokeWidth: "1" },
  };
}

export function colorWithOpacity(hex: string, opacity: number): string {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
