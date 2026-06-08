import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { NotificationSummary } from "@/api/grain-api-client";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";
import { COLORS, SPACING } from "@/utils/constants";
import { relativeTime } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";

type NotificationFilter = "all" | "drying" | "alerts" | "ai" | "system";

const filters: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "drying", label: "Drying" },
  { key: "alerts", label: "Alerts" },
  { key: "ai", label: "AI Actions" },
  { key: "system", label: "System" },
];

const emptyAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 160,
  h: 160,
  nm: "empty notifications",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "bell",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [-5] }, { t: 45, s: [5] }, { t: 90, s: [-5] }] },
        p: { a: 0, k: [80, 80, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [92, 92, 100] }, { t: 45, s: [104, 104, 100] }, { t: 90, s: [92, 92, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [82, 82] } },
            { ty: "st", c: { a: 0, k: [0.18, 0.35, 0.15, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 } },
            { ty: "fl", c: { a: 0, k: [0.93, 0.98, 0.91, 1] }, o: { a: 0, k: 100 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
      bm: 0,
    },
  ],
};

function filterForNotification(notification: NotificationSummary, filter: NotificationFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "drying") {
    return ["drying_complete", "session_started", "session_aborted", "session_milestone"].includes(notification.type);
  }

  if (filter === "alerts") {
    return ["alert_critical", "alert_warning", "weather_alert"].includes(notification.type);
  }

  if (filter === "ai") {
    return ["ai_action", "predictive_control"].includes(notification.type);
  }

  return ["device_offline"].includes(notification.type);
}

function notificationVisual(type: NotificationSummary["type"]): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
} {
  switch (type) {
    case "drying_complete":
      return { icon: "checkmark-circle", color: COLORS.success, bg: "rgba(34,197,94,0.14)" };
    case "alert_critical":
      return { icon: "radio-button-on", color: COLORS.danger, bg: "rgba(239,68,68,0.14)" };
    case "alert_warning":
      return { icon: "warning", color: COLORS.warning, bg: "rgba(245,158,11,0.14)" };
    case "device_offline":
      return { icon: "cloud-offline", color: "#8E8E93", bg: "rgba(142,142,147,0.16)" };
    case "session_started":
      return { icon: "play", color: COLORS.info, bg: "rgba(59,130,246,0.14)" };
    case "session_aborted":
      return { icon: "stop", color: "#F97316", bg: "rgba(249,115,22,0.14)" };
    case "predictive_control":
    case "ai_action":
      return { icon: "hardware-chip", color: "#8B5CF6", bg: "rgba(139,92,246,0.14)" };
    case "weather_alert":
      return { icon: "partly-sunny", color: "#38BDF8", bg: "rgba(56,189,248,0.14)" };
    case "session_milestone":
      return { icon: "flag", color: COLORS.primaryLight, bg: "rgba(34,197,94,0.14)" };
    default:
      return { icon: "notifications", color: COLORS.primary, bg: "rgba(45,90,39,0.12)" };
  }
}

function navigateForNotification(notification: NotificationSummary) {
  if (notification.type === "drying_complete" || notification.type === "session_started" || notification.type === "session_aborted" || notification.type === "session_milestone") {
    router.push("/(app)/sessions");
    return;
  }

  if (notification.type === "ai_action" || notification.type === "predictive_control") {
    router.push({
      pathname: "/agent-logs",
      params: notification.deviceId ? { deviceId: notification.deviceId } : {},
    } as never);
    return;
  }

  if ((notification.type === "device_offline" || notification.type === "alert_critical" || notification.type === "alert_warning") && notification.deviceId) {
    router.push({ pathname: "/(app)/device/[id]", params: { id: notification.deviceId } });
    return;
  }

  router.push("/(app)/alerts");
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationSummary;
  onPress: () => void;
}) {
  const { isDark, theme } = useTheme();
  const visual = notificationVisual(notification.type);
  const readBg = isDark ? "#151719" : "#F2F2F7";
  const unreadBg = isDark ? "#1C1C1E" : "#FFFFFF";

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardPressable}>
      <View
        style={[
          styles.notificationCard,
          {
            backgroundColor: notification.isRead ? readBg : unreadBg,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
          <Ionicons name={visual.icon} color={visual.color} size={22} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              numberOfLines={1}
              style={[
                styles.notificationTitle,
                {
                  color: theme.textPrimary,
                  fontWeight: notification.isRead ? "700" : "900",
                },
              ]}
            >
              {notification.title}
            </Text>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>{relativeTime(notification.createdAt)}</Text>
          </View>
          <Text numberOfLines={2} style={[styles.bodyText, { color: theme.textSecondary }]}>
            {notification.body}
          </Text>
          {notification.deviceId ? (
            <Text style={[styles.deviceText, { color: theme.textSecondary }]}>Device: {notification.deviceId}</Text>
          ) : null}
        </View>
        {!notification.isRead ? <View style={[styles.unreadDot, { backgroundColor: visual.color }]} /> : null}
      </View>
    </Pressable>
  );
}

function EmptyNotifications() {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <LottieView autoPlay loop source={emptyAnimation} style={styles.emptyLottie} />
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No notifications yet</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Dryer updates, AI actions, and system notices will appear here.
      </Text>
    </View>
  );
}

export function AlertsScreen() {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const filterFn = useCallback(
    (notification: NotificationSummary) => filterForNotification(notification, activeFilter),
    [activeFilter],
  );
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    markAsRead,
    loadMore,
    refetch,
  } = useNotifications(filterFn);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomPadding = useBottomTabPadding(34);

  const title = useMemo(() => (unreadCount > 0 ? `${unreadCount} unread` : "All caught up"), [unreadCount]);

  const refresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const openNotification = async (notification: NotificationSummary) => {
    if (!notification.isRead) {
      await markAsRead([notification._id]);
    }
    navigateForNotification(notification);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        data={notifications}
        keyExtractor={(item: NotificationSummary) => item._id}
        ListEmptyComponent={!isLoading ? <EmptyNotifications /> : null}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{title}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={unreadCount === 0}
                onPress={() => void markAsRead()}
                style={[styles.markAllButton, unreadCount === 0 && styles.markAllDisabled]}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              contentContainerStyle={styles.filterContent}
              showsHorizontalScrollIndicator={false}
            >
              {filters.map((filter) => {
                const selected = activeFilter === filter.key;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? theme.accentPrimary : theme.bgCard,
                        borderColor: selected ? theme.accentPrimary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterText, { color: selected ? "#FFFFFF" : theme.textSecondary }]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
          </View>
        }
        onEndReached={() => {
          if (hasMore) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.4}
        onRefresh={() => void refresh()}
        refreshing={isRefreshing}
        renderItem={({ item }: { item: NotificationSummary }) => (
          <NotificationCard notification={item} onPress={() => void openNotification(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  cardPressable: {
    borderRadius: 18,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  deviceText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyLottie: {
    height: 132,
    width: 132,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: 80,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "900",
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  headerContent: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  markAllButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  markAllDisabled: {
    opacity: 0.45,
  },
  markAllText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  notificationCard: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  notificationContent: {
    flex: 1,
    gap: 3,
  },
  notificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
  },
  unreadDot: {
    borderRadius: 5,
    height: 10,
    marginTop: 7,
    width: 10,
  },
});
