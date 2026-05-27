import { Tabs, Redirect, usePathname } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AssistantFAB } from "@/components/AssistantFAB";
import { AssistantModal } from "@/components/AssistantModal";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { ButilReaction } from "@/components/mascot/ButilReaction";
import { ServerStatusBanner } from "@/components/ServerStatusBanner";
import { tabScreenOptions, tabs } from "@/components/Navigation";
import { AssistantProvider } from "@/context/AssistantContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTutorial } from "@/context/TutorialContext";
import { InteractiveTutorial } from "@/screens/onboarding/InteractiveTutorial";
import { COLORS } from "@/utils/constants";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const { tutorialsDone, startTutorial } = useTutorial();
  const pathname = usePathname();

  useEffect(() => {
    const screen = pathname.includes("/control")
      ? "control"
      : pathname.includes("/sessions")
        ? "sessions"
        : pathname.includes("/device/")
          ? "device"
          : pathname.includes("/dashboard")
            ? "dashboard"
            : null;

    if (screen && !tutorialsDone[screen]) {
      const timeout = setTimeout(() => startTutorial(screen), 700);
      return () => clearTimeout(timeout);
    }
  }, [pathname, startTutorial, tutorialsDone]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AssistantProvider>
      <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: theme.bgBase }]}>
        <ServerStatusBanner />
        <Tabs screenOptions={tabScreenOptions()} tabBar={(props) => <AnimatedTabBar {...props} />}>
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.label,
              }}
            />
          ))}
          <Tabs.Screen name="device/[id]" options={{ href: null }} />
          <Tabs.Screen name="ai-prediction" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
          <Tabs.Screen name="add-device" options={{ href: null }} />
        </Tabs>
        <AssistantFAB />
        <AssistantModal />
        <ButilReaction />
        <InteractiveTutorial />
      </SafeAreaView>
    </AssistantProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
});
