import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useTutorial } from "@/context/TutorialContext";
import { COLORS } from "@/utils/constants";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { onboardingDone, isLoadingTutorialState } = useTutorial();

  if (isLoading || isLoadingTutorialState) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
});
