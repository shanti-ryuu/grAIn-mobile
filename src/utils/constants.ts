export const COLORS = {
  primary: "#2D5A27",
  primaryLight: "#22C55E",
  primaryDark: "#16A34A",
  background: "#F6FAFF",
  card: "rgba(255,255,255,0.72)",
  textPrimary: "#111114",
  textSecondary: "#636366",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  success: "#22C55E",
  border: "rgba(255,255,255,0.42)",
  running: "#10B981",
  idle: "#6B7280",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const SENSOR_THRESHOLDS = {
  TEMP_WARNING: 45,
  TEMP_DANGER: 55,
  TEMP_CRITICAL: 65,
  HUMIDITY_WARNING: 75,
  HUMIDITY_DANGER: 85,
  MOISTURE_TARGET: 14,
  MOISTURE_WARNING: 20,
  MOISTURE_MIN: 10,
} as const;

export const API_TIMEOUT = {
  DEFAULT: 30000,
  HEALTH: 5000,
} as const;
