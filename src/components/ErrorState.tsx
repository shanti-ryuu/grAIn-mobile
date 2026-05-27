import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Butil } from "@/components/mascot/Butil";
import { useTheme } from "@/context/ThemeContext";
import { SPACING } from "@/utils/constants";

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({ error, onRetry, fullScreen = false }: ErrorStateProps) {
  const { theme } = useTheme();
  const message = typeof error === "string" ? error : error.message;
  const networkMessage = message.toLowerCase().includes("network")
    ? "Can't connect to server. Check your internet connection."
    : message;

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, { backgroundColor: theme.bgBase }]}>
      <Butil mood="thinking" size={88} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>Something went wrong</Text>
      <Text numberOfLines={2} style={[styles.message, { color: theme.textSecondary }]}>
        {networkMessage}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityLabel="Try again"
          accessibilityRole="button"
          onPress={onRetry}
          style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}
        >
          <Text style={styles.primaryText}>Try Again</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel="Go to dashboard"
        accessibilityRole="button"
        onPress={() => router.replace("/(app)/dashboard")}
        style={styles.linkButton}
      >
        <Text style={[styles.linkText, { color: theme.accentPrimary }]}>Go to Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 18,
    gap: SPACING.sm,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  fullScreen: {
    flex: 1,
  },
  linkButton: {
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "900",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    borderRadius: 14,
    marginTop: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
});
