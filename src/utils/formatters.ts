import { COLORS, SENSOR_THRESHOLDS } from "@/utils/constants";

export function formatRelativeTime(date: string): string {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return "just now";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "< 1m";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatMoisture(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTemperature(value: number): string {
  return `${value.toFixed(1)} C`;
}

export function formatEnergy(value: number): string {
  return `${value.toFixed(2)} kWh`;
}

export function formatWeight(rawGrams: number): string {
  if (!rawGrams || rawGrams <= 0) {
    return "0.0 kg";
  }

  return `${(rawGrams / 1000).toFixed(1)} kg`;
}

export function getMoistureColor(value: number): string {
  if (value <= SENSOR_THRESHOLDS.MOISTURE_TARGET) {
    return COLORS.success;
  }
  if (value <= SENSOR_THRESHOLDS.MOISTURE_WARNING) {
    return COLORS.warning;
  }
  return COLORS.danger;
}

export function getTemperatureColor(value: number): string {
  if (value > SENSOR_THRESHOLDS.TEMP_DANGER) {
    return COLORS.danger;
  }
  if (value > SENSOR_THRESHOLDS.TEMP_WARNING) {
    return COLORS.warning;
  }
  return COLORS.success;
}
