import * as Haptics from "expo-haptics";

async function safeRun(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch {
    // Haptics can be unavailable on some devices.
  }
}

export const haptics = {
  light: () => safeRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safeRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safeRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: () => safeRun(() => Haptics.selectionAsync()),
};
