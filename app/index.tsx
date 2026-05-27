import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useTutorial } from "@/context/TutorialContext";
import { COLORS } from "@/utils/constants";

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const { onboardingDone, isLoadingTutorialState } = useTutorial();

  useEffect(() => {
    if (isLoading || isLoadingTutorialState) {
      return;
    }

    if (!onboardingDone) {
      router.replace("/onboarding");
      return;
    }

    router.replace(isAuthenticated ? "/(app)/dashboard" : "/(auth)/login");
  }, [isAuthenticated, isLoading, isLoadingTutorialState, onboardingDone]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
});
