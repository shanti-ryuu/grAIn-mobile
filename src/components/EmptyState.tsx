import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Butil, ButilMood } from "@/components/mascot/Butil";
import { useTheme } from "@/context/ThemeContext";
import { SPACING } from "@/utils/constants";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  mood?: ButilMood;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  mood = "thinking",
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.accentPrimarySubtle }]}>
          <Ionicons name={icon} size={30} color={theme.accentPrimary} />
        </View>
      ) : (
        <Butil mood={mood} size={84} />
      )}
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityHint={actionLabel}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.action, { backgroundColor: theme.accentPrimary }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    borderRadius: 14,
    marginTop: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  container: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: SPACING.sm,
    justifyContent: "center",
    marginVertical: SPACING.md,
    padding: SPACING.lg,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 24,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
});
