import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AlertSummary, grainApi, NotificationSummary } from "@/api/grain-api-client";
import { AlertCard } from "@/components/AlertCard";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData, getPaginationTotal, relativeTime } from "@/utils/data";
import { useBottomTabPadding, useFloatingTabOffset } from "@/utils/layout";

type AlertFilter = "all" | "critical" | "warning" | "info";

function notificationIcon(type: NotificationSummary["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "drying_complete") {
    return "checkmark-circle";
  }
  if (type === "device_offline") {
    return "cloud-offline";
  }
  if (type === "alert_critical" || type === "alert_warning") {
    return "alert-circle";
  }
  return "notifications";
}

function navigateForNotification(notification: NotificationSummary) {
  if (notification.type === "drying_complete" || notification.type === "session_started" || notification.type === "session_aborted") {
    router.push("/(app)/sessions");
    return;
  }

  if ((notification.type === "alert_critical" || notification.type === "device_offline") && notification.deviceId) {
    router.push({ pathname: "/(app)/device/[id]", params: { id: notification.deviceId } });
    return;
  }

  router.push("/(app)/alerts");
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: NotificationSummary;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.notificationCard, notification.isRead && styles.readItem]}>
        <View style={[styles.notificationIconWrap, { backgroundColor: theme.accentPrimarySubtle }]}>
          <Ionicons name={notificationIcon(notification.type)} size={21} color={theme.accentPrimary} />
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.rowBetween}>
              <Text style={[styles.notificationTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.isRead ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={[styles.notificationText, { color: theme.textSecondary }]} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>{relativeTime(notification.createdAt)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function AlertsScreen() {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { notifications, unreadCount, isLoading: notificationsLoading, markAsRead, refetch: refetchNotifications } = useNotifications();
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(88);
  const floatingBottom = useFloatingTabOffset(12);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = filter === "all" ? { limit: 40 } : { type: filter, limit: 40 };
      const [alertsResponse, unreadResponse] = await Promise.all([
        grainApi.alerts.getAll(params),
        grainApi.alerts.getAll({ isRead: false, limit: 1 }),
      ]);
      const alertItems = getListData<AlertSummary>(alertsResponse);
      const unreadItems = getListData<AlertSummary>(unreadResponse);
      setAlerts(alertItems);
      setUnreadAlertCount(getPaginationTotal(unreadResponse, unreadItems.length));
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAlerts(), refetchNotifications()]);
    setIsRefreshing(false);
  };

  const filteredAlerts = useMemo(() => alerts, [alerts]);

  const markAlertRead = async (alert: AlertSummary) => {
    if (!alert.isRead) {
      await grainApi.alerts.markRead(alert._id);
      await fetchAlerts();
    }
  };

  const clearAll = async () => {
    await grainApi.alerts.clear();
    await fetchAlerts();
  };

  const totalUnread = unreadAlertCount + unreadCount;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        data={filteredAlerts}
        keyExtractor={(item: AlertSummary) => item._id}
        ListEmptyComponent={
          !isLoadingAlerts ? (
            <EmptyState
              mood="excited"
              title="All clear"
              subtitle="No alerts. Your dryer is running smoothly."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={styles.notificationsSection}>
            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={[styles.separatorText, { color: theme.textSecondary }]}>Notifications</Text>
              <View style={styles.separatorLine} />
            </View>
            {notificationsLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onPress={() => {
                    void markAsRead([notification._id]).then(() => navigateForNotification(notification));
                  }}
                />
              ))
            ) : (
              filteredAlerts.length === 0 ? <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No account notifications yet.</Text> : null
            )}
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Alerts</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Warnings, critical events, and system notices.</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalUnread}</Text>
              </View>
            </View>
            <View style={styles.filterRow}>
              {(["all", "critical", "warning", "info"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                    filter === item && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                  ]}
                >
                  <Text style={[styles.filterText, { color: filter === item ? "#FFFFFF" : theme.textSecondary }]}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isLoadingAlerts ? <ActivityIndicator color={COLORS.primary} /> : null}
          </View>
        }
        onRefresh={() => void refreshAll()}
        refreshing={isRefreshing}
        renderItem={({ item }: { item: AlertSummary }) => <AlertCard alert={item} onPress={() => void markAlertRead(item)} />}
      />

      <Pressable onPress={() => void clearAll()} style={[styles.clearButton, { bottom: floatingBottom }]}>
        <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
        <Text style={styles.clearButtonText}>Clear All Alerts</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    minWidth: 34,
    marginRight: 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    left: SPACING.md,
    paddingVertical: 15,
    position: "absolute",
    right: SPACING.md,
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    padding: SPACING.md,
    paddingBottom: 170,
  },
  emptyCard: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerContent: {
    gap: SPACING.md,
  },
  notificationBody: {
    flex: 1,
  },
  notificationCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  notificationIconWrap: {
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notificationsSection: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  notificationText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  notificationTitle: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  readItem: {
    opacity: 0.6,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  separatorLine: {
    backgroundColor: COLORS.border,
    flex: 1,
    height: 1,
  },
  separatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  separatorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
  unreadDot: {
    backgroundColor: COLORS.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
});
