import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AlertSummary, DeviceSummary, grainApi, SessionSummary } from "@/api/grain-api-client";
import { AlertCard } from "@/components/AlertCard";
import { BrandLogo } from "@/components/BrandLogo";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { useDevices } from "@/hooks/useDevices";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData, getPaginationTotal, relativeTime, sessionProgress } from "@/utils/data";
import { formatDuration } from "@/utils/formatters";
import { useBottomTabPadding } from "@/utils/layout";

function formatNumber(value?: number, decimals = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimals) : "--";
}

function Header({ unreadCount }: { unreadCount: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.header}>
      <View>
        <BrandLogo style={styles.headerLogo} />
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Mobile dryer monitor</Text>
      </View>
      <View style={[styles.bellButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Ionicons name="notifications" size={23} color={theme.textPrimary} />
        {unreadCount > 0 ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.bgElevated }]}>
      <View style={[styles.progressFill, { backgroundColor: theme.statusOnline, width: `${Math.max(0, Math.min(100, progress))}%` }]} />
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color ?? theme.textSecondary }]}>{label}</Text>
    </Card>
  );
}

export function DashboardScreen() {
  const { devices, isLoading, error, refetch } = useDevices();
  const { openAssistant } = useAssistant();
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const [activeSessions, setActiveSessions] = useState<SessionSummary[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertSummary[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const [sessionsResponse, alertsResponse, unreadAlertsResponse, notificationsResponse] = await Promise.allSettled([
      grainApi.sessions.list({ status: "active", limit: 3 }),
      grainApi.alerts.getAll({ limit: 3 }),
      grainApi.alerts.getAll({ isRead: false, limit: 1 }),
      grainApi.notifications.list({ unread: true, limit: 1 }),
    ]);

    if (sessionsResponse.status === "fulfilled") {
      setActiveSessions(getListData<SessionSummary>(sessionsResponse.value));
    }
    if (alertsResponse.status === "fulfilled") {
      setRecentAlerts(getListData<AlertSummary>(alertsResponse.value).slice(0, 3));
    }
    if (unreadAlertsResponse.status === "fulfilled") {
      const unreadAlerts = getListData<AlertSummary>(unreadAlertsResponse.value);
      setUnreadAlertCount(getPaginationTotal(unreadAlertsResponse.value, unreadAlerts.length));
    }
    if (notificationsResponse.status === "fulfilled") {
      const notifications = getListData<unknown>(notificationsResponse.value);
      setUnreadNotificationCount(getPaginationTotal(notificationsResponse.value, notifications.length));
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => {
      void fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onlineDevices = useMemo(() => devices.filter((device) => device.status === "online").length, [devices]);
  const firstActiveSession = activeSessions[0];
  const activeProgress = firstActiveSession
    ? sessionProgress(
        firstActiveSession.startMoisture,
        firstActiveSession.currentMoisture,
        firstActiveSession.targetMoisture,
      )
    : 0;

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), fetchDashboardData()]);
    setIsRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />}
      >
        <Header unreadCount={unreadNotificationCount} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Devices</Text>
          {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={devices}
          horizontal
          keyExtractor={(item: DeviceSummary) => item._id}
          renderItem={({ item }: { item: DeviceSummary }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(app)/device/[id]",
                  params: { id: item.deviceId },
                })
              }
              style={[
                styles.deviceCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: item.status === "online" ? theme.statusOnline : theme.border,
                },
              ]}
            >
              <View style={styles.deviceTopRow}>
                <View style={styles.deviceTitleWrap}>
                  <Text style={[styles.deviceName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.deviceId, { color: theme.textSecondary }]}>{item.deviceId}</Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>
              <Text style={[styles.moistureValue, { color: theme.accentPrimary }]}>{formatNumber(item.lastMoisture)}%</Text>
              <Text style={[styles.deviceMetric, { color: theme.textSecondary }]}>
                Temperature: {formatNumber(item.runtimeState?.currentTemperature as number | undefined)} °C
              </Text>
              <Text style={[styles.deviceMetric, { color: theme.textSecondary }]}>Last active: {relativeTime(item.lastActive)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title="No devices yet"
                subtitle="Add your first grAIn dryer to start monitoring live readings."
                actionLabel="Add Device"
                onAction={() => router.push("/(app)/add-device")}
              />
            ) : null
          }
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalList}
        />

        {firstActiveSession ? (
          <Card style={styles.activeCard}>
            <View style={styles.cardTitleRow}>
              <View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Active Drying Session</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {firstActiveSession.grainType} - {firstActiveSession.deviceId}
                </Text>
              </View>
              <StatusBadge status="active" size="sm" />
            </View>
            <ProgressBar progress={activeProgress} />
            <View style={styles.sessionMetaRow}>
              <Text style={[styles.sessionLabel, { color: theme.textPrimary }]}>Drying in progress...</Text>
              <Text style={[styles.sessionValue, { color: theme.accentPrimary }]}>{activeProgress.toFixed(0)}%</Text>
            </View>
            <Text style={[styles.sessionDetail, { color: theme.textSecondary }]}>
              {formatNumber(firstActiveSession.currentMoisture)}% current vs{" "}
              {formatNumber(firstActiveSession.targetMoisture, 0)}% target
            </Text>
            <Text style={[styles.sessionDetail, { color: theme.textSecondary }]}>
              Elapsed:{" "}
              {firstActiveSession.startedAt
                ? formatDuration(Math.max(0, Math.floor((Date.now() - new Date(firstActiveSession.startedAt).getTime()) / 1000)))
                : "Unknown"}
            </Text>
          </Card>
        ) : (
          <Card style={styles.activeCard}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>No active drying session</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Start a session from the Sessions tab when a dryer is online.</Text>
          </Card>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Online Devices" value={`${onlineDevices}/${devices.length}`} color={COLORS.success} />
          <StatCard label="Active Sessions" value={activeSessions.length} color={COLORS.info} />
          <StatCard
            label="Unread Alerts"
            value={unreadAlertCount}
            color={unreadAlertCount > 0 ? COLORS.danger : COLORS.textSecondary}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Alerts</Text>
          <Pressable onPress={() => router.push("/(app)/alerts")}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.alertList}>
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert) => <AlertCard key={alert._id} alert={alert} />)
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent alerts.</Text>
          )}
        </View>

        <Pressable style={styles.assistantButton} onPress={openAssistant}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.assistantText}>Ask grAIn Assistant</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  alertList: {
    gap: SPACING.sm,
  },
  assistantButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginTop: SPACING.lg,
    paddingVertical: 15,
  },
  assistantText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  bellButton: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textTransform: "capitalize",
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 110,
  },
  deviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: SPACING.md,
    padding: SPACING.md,
    width: 240,
  },
  deviceId: {
    color: COLORS.textSecondary,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
  },
  deviceMetric: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },
  deviceName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  deviceTitleWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  deviceTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  horizontalList: {
    marginHorizontal: -SPACING.md,
    paddingLeft: SPACING.md,
  },
  headerLogo: {
    height: 40,
    width: 128,
  },
  moistureValue: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: "900",
    marginTop: SPACING.md,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 5,
    width: 18,
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  progressFill: {
    backgroundColor: COLORS.success,
    borderRadius: 999,
    height: "100%",
  },
  progressTrack: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  sessionDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  sessionLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  sessionMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  statCard: {
    flex: 1,
    padding: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  viewAll: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
