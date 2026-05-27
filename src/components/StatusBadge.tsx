import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

function getColors(status: string, theme: ReturnType<typeof useTheme>["theme"]): { backgroundColor: string; color: string } {
  switch (status) {
    case "online":
    case "running":
    case "completed":
      return { backgroundColor: theme.accentPrimarySubtle, color: theme.statusOnline };
    case "active":
      return { backgroundColor: theme.bgElevated, color: theme.accentPrimary };
    case "critical":
    case "aborted":
      return { backgroundColor: theme.bgElevated, color: theme.statusDanger };
    case "warning":
      return { backgroundColor: theme.bgElevated, color: theme.statusWarning };
    case "info":
      return { backgroundColor: theme.bgElevated, color: theme.accentPrimaryLight };
    default:
      return { backgroundColor: theme.bgElevated, color: theme.textSecondary };
  }
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { theme } = useTheme();
  const colors = getColors(status, theme);
  return (
    <View style={[styles.badge, size === "sm" ? styles.smallBadge : styles.mediumBadge, colors]}>
      <Text style={[styles.text, size === "sm" ? styles.smallText : styles.mediumText, { color: colors.color }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontWeight: "700",
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
});
