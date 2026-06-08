import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NotificationSummary } from "@/api/grain-api-client";

export const NOTIFICATION_PREFERENCES_KEY = "notification_preferences";

export type NotificationPreferenceKey =
  | "dryingComplete"
  | "criticalTemperature"
  | "highHumidity"
  | "lowMoisture"
  | "deviceOffline"
  | "sessionStarted"
  | "sessionAborted"
  | "aiAutoControl"
  | "dryingMilestones"
  | "weatherWarnings";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  dryingComplete: true,
  criticalTemperature: true,
  highHumidity: true,
  lowMoisture: true,
  deviceOffline: true,
  sessionStarted: false,
  sessionAborted: true,
  aiAutoControl: true,
  dryingMilestones: true,
  weatherWarnings: true,
};

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const saved = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
  if (!saved) {
    return defaultNotificationPreferences;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
    return { ...defaultNotificationPreferences, ...parsed };
  } catch {
    return defaultNotificationPreferences;
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
}

function bodyHas(notification: NotificationSummary, patterns: RegExp[]): boolean {
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

export function shouldShowNotification(
  notification: NotificationSummary,
  preferences: NotificationPreferences,
): boolean {
  switch (notification.type) {
    case "drying_complete":
      return preferences.dryingComplete;
    case "session_milestone":
      return preferences.dryingMilestones;
    case "alert_critical":
      if (bodyHas(notification, [/temp|temperature/])) {
        return preferences.criticalTemperature;
      }
      return preferences.criticalTemperature || preferences.lowMoisture || preferences.highHumidity;
    case "alert_warning":
      if (bodyHas(notification, [/humid|humidity/])) {
        return preferences.highHumidity;
      }
      if (bodyHas(notification, [/moist|moisture/])) {
        return preferences.lowMoisture;
      }
      return preferences.highHumidity || preferences.lowMoisture;
    case "device_offline":
      return preferences.deviceOffline;
    case "session_started":
      return preferences.sessionStarted;
    case "session_aborted":
      return preferences.sessionAborted;
    case "predictive_control":
    case "ai_action":
      return preferences.aiAutoControl;
    case "weather_alert":
      return preferences.weatherWarnings;
    default:
      return true;
  }
}

export function hasAnyNotificationPreferenceEnabled(preferences: NotificationPreferences): boolean {
  return Object.values(preferences).some(Boolean);
}
