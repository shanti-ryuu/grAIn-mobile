import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AlertSummary } from "@/api/grain-api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";
import { relativeTime } from "@/utils/data";

type AlertCardProps = {
  alert: Pick<AlertSummary, "type" | "message" | "createdAt" | "isRead"> & Partial<Pick<AlertSummary, "deviceId">>;
  onPress?: () => void;
};

function colorForType(type: AlertSummary["type"]): string {
  if (type === "critical") {
    return COLORS.danger;
  }
  if (type === "warning") {
    return COLORS.warning;
  }
  return COLORS.info;
}

function iconForType(type: AlertSummary["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "critical") {
    return "alert-circle";
  }
  if (type === "warning") {
    return "warning";
  }
  return "information-circle";
}

export function AlertCard({ alert, onPress }: AlertCardProps) {
  const color = colorForType(alert.type);
  const { theme } = useTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, alert.isRead && styles.readCard]}
    >
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.iconWrap}>
        <Ionicons name={iconForType(alert.type)} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <StatusBadge status={alert.type} size="sm" />
          {!alert.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={[styles.message, { color: theme.textPrimary }]} numberOfLines={2}>
          {alert.message}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {alert.deviceId ? `${alert.deviceId} - ` : ""}
          {relativeTime(alert.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: "stretch",
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 14,
    width: 5,
  },
  card: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingRight: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: SPACING.sm,
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  readCard: {
    opacity: 0.58,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  unreadDot: {
    backgroundColor: COLORS.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
});
