import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ReactNode, useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AssistantModal } from "@/components/AssistantModal";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { COLORS, SPACING } from "@/utils/constants";
import { useTheme } from "@/context/ThemeContext";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function ErrorBoundary({ error }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error.message}</Text>
    </View>
  );
}

function RootProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function PushNotificationBootstrap() {
  const { isAuthenticated } = useAuth();
  const { registerForPushNotifications } = usePushNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      void registerForPushNotifications();
    }
  }, [isAuthenticated, registerForPushNotifications]);

  return null;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function LoadingScreen() {
  const { isDark, theme } = useTheme();
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const dotOne = useRef(new Animated.Value(0.3)).current;
  const dotTwo = useRef(new Animated.Value(0.3)).current;
  const dotThree = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 260,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();

    const animateDot = (dot: any, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          Animated.delay(520 - delay),
        ]),
      );

    const animations = [animateDot(dotOne, 0), animateDot(dotTwo, 160), animateDot(dotThree, 320)];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dotOne, dotThree, dotTwo, logoOpacity, logoScale]);

  return (
    <LinearGradient
      colors={isDark ? ["#0F1410", "#0A1A0C"] : ["#FAFAF8", "#E8F5E9"]}
      style={styles.loadingContainer}
    >
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          accessibilityLabel="grAIn logo"
          resizeMode="contain"
          source={
            isDark
              ? require("../assets/grAIn_logo_dark_1024.png")
              : require("../assets/grAIn_logo_light_1024.png")
          }
          style={styles.loadingLogo}
        />
      </Animated.View>
      <View style={styles.loadingDots} accessibilityLabel="Loading grAIn">
        {[dotOne, dotTwo, dotThree].map((dot, index) => (
          <Animated.View
            key={index}
            style={[styles.loadingDot, { backgroundColor: theme.accentPrimary, opacity: dot }]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

function AppBootstrap() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <AssistantModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <RootProviders>
      <PushNotificationBootstrap />
      <ThemedStatusBar />
      <AppBootstrap />
    </RootProviders>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: SPACING.sm,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  loadingDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  loadingDots: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  loadingLogo: {
    height: 190,
    width: 190,
  },
});
