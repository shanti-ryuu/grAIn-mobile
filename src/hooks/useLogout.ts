import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback } from "react";

import { useAuth } from "@/context/AuthContext";

export function useLogout() {
  const { logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    const keys = await AsyncStorage.getAllKeys();
    const removableKeys = keys.filter(
      (key) => key.startsWith("control_") || key === "@grain_chat_lang" || key === "@grain_push_token",
    );
    if (removableKeys.length > 0) {
      await AsyncStorage.multiRemove(removableKeys);
    }
    router.replace("/(auth)/login");
  }, [logout]);

  return { handleLogout };
}
