export type SwitchState = "ON" | "OFF";

export interface ChamberTelemetry {
  temperature: number;
  humidity: number;
  moisture: number;
  fanSpeed: number;
  isRunning: boolean;
  heaterState: SwitchState;
  fan1State: SwitchState;
  fan2State: SwitchState;
  weight: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function moistureColor(moisture: number): string {
  if (moisture > 20) {
    return "#8B7355";
  }
  if (moisture >= 14) {
    return "#C4A962";
  }
  return "#E8D5A3";
}

export function temperatureColor(temperature: number): string {
  if (temperature < 40) {
    return "#81D4FA";
  }
  if (temperature <= 55) {
    return "#FFE0B2";
  }
  return "#FF8A65";
}
