import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

import { grainApi } from "@/api/grain-api-client";

const PUSH_TOKEN_KEY = "@grain_push_token";

type NotificationData = {
  type?: string;
  deviceId?: string;
};

function navigateFromData(data: NotificationData): void {
  if (data.type === "drying_complete") {
    router.push("/(app)/sessions");
    return;
  }

  if ((data.type === "alert_critical" || data.type === "device_offline") && data.deviceId) {
    router.push({ pathname: "/(app)/device/[id]", params: { id: data.deviceId } });
    return;
  }

  router.push("/(app)/alerts");
}

export function setupNotificationHandlers(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromData(response.notification.request.content.data as NotificationData);
  });

  return () => {
    responseSubscription.remove();
  };
}

export function usePushNotifications() {
  const registerForPushNotifications = useCallback(async () => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      const permission =
        existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();

      if (permission.status !== "granted") {
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        // Expo Go/local dev without EAS project config cannot register Expo push tokens.
        return null;
      }
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        { projectId },
      );
      const token = tokenResponse.data;
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await grainApi.notifications.registerFCMToken(
        token,
        Platform.OS === "ios" ? "ios" : "android",
      );
      return token;
    } catch (error) {
      console.warn("Push notification registration skipped", error);
      return null;
    }
  }, []);

  useEffect(() => setupNotificationHandlers(), []);

  return { registerForPushNotifications, setupNotificationHandlers };
}
