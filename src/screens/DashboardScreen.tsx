import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AlertSummary, DeviceSummary, grainApi, SessionSummary } from "@/api/grain-api-client";
import { AlertCard } from "@/components/AlertCard";
import { AnimatePressable } from "@/components/AnimatePressable";
import { BrandLogo } from "@/components/BrandLogo";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { useDevices } from "@/hooks/useDevices";
import { useWeather } from "@/hooks/useWeather";
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
    <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
      <View>
        <BrandLogo style={styles.headerLogo} />
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Mobile dryer monitor</Text>
      </View>
      <Pressable
        accessibilityLabel="Open notifications"
        accessibilityRole="button"
        onPress={() => router.push("/(app)/alerts")}
        style={[styles.bellButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
      >
        <Ionicons name="notifications" size={23} color={theme.textPrimary} />
        {unreadCount > 0 ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>
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
      <Text style={[styles.statLabel, { color: color ?? theme.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </Card>
  );
}

export function DashboardScreen() {
  const { devices, isLoading, error, refetch } = useDevices();
  const { openAssistant } = useAssistant();
  const { isDark, theme } = useTheme();
  const bottomPadding = Math.max(useBottomTabPadding(36), 120);
  const secondaryCardBg = isDark ? "#1C1C1E" : theme.bgCard;
  const secondaryCardBorder = isDark ? "#2C2C2E" : theme.border;
  const [activeSessions, setActiveSessions] = useState<SessionSummary[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertSummary[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const weatherQuery = useWeather(true);

  const fetchDashboardData = useCallback(async () => {
    const [sessionsResponse, alertsResponse, unreadAlertsResponse, notificationsResponse] = await Promise.allSettled([
      grainApi.sessions.list({ status: "active", limit: 3 }),
      grainApi.alerts.getAll({ limit: 8 }),
      grainApi.alerts.getAll({ isRead: false, limit: 1 }),
      grainApi.notifications.list({ unread: true, limit: 1 }),
    ]);

    if (sessionsResponse.status === "fulfilled") {
      setActiveSessions(getListData<SessionSummary>(sessionsResponse.value));
    }
    if (alertsResponse.status === "fulfilled") {
      setRecentAlerts(getListData<AlertSummary>(alertsResponse.value).slice(0, 8));
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
    await Promise.all([refetch(), fetchDashboardData(), weatherQuery.refetch()]);
    setIsRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Header unreadCount={unreadNotificationCount} />
      <ScrollView
        directionalLockEnabled
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <WeatherWidget
          cachedAt={weatherQuery.cachedAt}
          error={weatherQuery.error}
          loading={weatherQuery.loading}
          onEnable={() => void weatherQuery.refetch()}
          onRefresh={() => void weatherQuery.refetch()}
          permissionDenied={weatherQuery.permissionStatus === "denied"}
          weather={weatherQuery.weather}
        />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Devices</Text>
          {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.deviceList}>
          {devices.length > 0 ? (
            devices.map((item: DeviceSummary) => (
            <Pressable
              key={item._id}
              onPress={() =>
                router.push({
                  pathname: "/(app)/device/[id]",
                  params: { id: item.deviceId },
                })
              }
              style={[
                styles.deviceRowCard,
                { backgroundColor: secondaryCardBg, borderColor: item.status === "online" ? theme.statusOnline : secondaryCardBorder },
              ]}
            >
              <View style={styles.deviceRowMain}>
                <View style={[styles.deviceAvatar, { backgroundColor: item.status === "online" ? theme.accentPrimarySubtle : theme.bgElevated }]}>
                  <Ionicons name="hardware-chip-outline" size={20} color={item.status === "online" ? theme.accentPrimary : theme.textTertiary} />
                </View>
                <View style={styles.deviceTitleWrap}>
                  <Text style={[styles.deviceName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.deviceId, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.deviceId} - Last active {relativeTime(item.lastActive)}
                  </Text>
                </View>
              </View>
              <View style={styles.deviceRowRight}>
                <StatusBadge status={item.status} size="sm" />
                <Text style={[styles.deviceMoisture, { color: item.status === "online" ? theme.accentPrimary : theme.textTertiary }]}>
                  {item.status === "online" ? `${formatNumber(item.lastMoisture)}%` : "-- %"}
                </Text>
              </View>
            </Pressable>
            ))
          ) : !isLoading ? (
            <EmptyState
              icon="qr-code"
              title="No devices yet"
              subtitle="Scan a QR code to claim your dryer"
              actionLabel="Scan QR Code"
              onAction={() => router.push("/(app)/claim-device" as never)}
            />
          ) : null}
        </View>

        {firstActiveSession ? (
          <Card style={[styles.activeCard, { backgroundColor: secondaryCardBg, borderColor: secondaryCardBorder }]}>
            <View style={styles.cardTitleRow}>
              <View>
                <Text style={[styles.cardTitle, { color: isDark ? "#FFFFFF" : theme.textPrimary }]}>Active Drying Session</Text>
                <Text style={[styles.cardSubtitle, { color: isDark ? "#D1D5DB" : theme.textSecondary }]}>
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
          <Card style={[styles.activeCard, { backgroundColor: secondaryCardBg, borderColor: secondaryCardBorder }]}>
            <Text style={[styles.cardTitle, { color: isDark ? "#FFFFFF" : theme.textPrimary }]}>No active drying session</Text>
            <Text style={[styles.cardSubtitle, { color: isDark ? "#D1D5DB" : "#555555" }]}>Start a session from the Sessions tab when a dryer is online.</Text>
          </Card>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Online Devices" value={`${onlineDevices}/${devices.length}`} color={isDark ? "#4CD964" : COLORS.success} />
          <StatCard label="Active Sessions" value={activeSessions.length} color={COLORS.info} />
          <StatCard
            label="Unread Alerts"
            value={unreadAlertCount}
            color={unreadAlertCount > 0 ? COLORS.danger : COLORS.textSecondary}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : theme.textPrimary }]}>Recent Alerts</Text>
          <Pressable onPress={() => router.push("/(app)/alerts")}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>
        <View style={[styles.alertStackViewport, recentAlerts.length === 0 && styles.alertStackEmptyViewport]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.alertStackContent}
            nestedScrollEnabled
            scrollEnabled={recentAlerts.length > 2}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.alertStack}
          >
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <View key={alert._id} style={styles.alertStackItem}>
                  {!isDark ? (
                    <>
                      <View style={[styles.alertDepthLayer, styles.alertDepthLayerBack]} />
                      <View style={[styles.alertDepthLayer, styles.alertDepthLayerMid]} />
                    </>
                  ) : null}
                  <AlertCard
                    alert={alert}
                    onDismiss={() => setRecentAlerts((current) => current.filter((item) => item._id !== alert._id))}
                    variant="notification"
                  />
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent alerts.</Text>
            )}
          </ScrollView>
        </View>

        <AnimatePressable style={styles.assistantButton} onPress={openAssistant}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.assistantText}>Ask grAIn Assistant</Text>
        </AnimatePressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  alertStack: {
    flex: 1,
  },
  alertStackContent: {
    gap: 14,
    paddingBottom: SPACING.lg,
    paddingTop: 4,
  },
  alertStackViewport: {
    borderRadius: 24,
    height: 286,
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  alertStackEmptyViewport: {
    height: 62,
  },
  alertDepthLayer: {
    backgroundColor: "#ECECF2",
    borderRadius: 22,
    bottom: 2,
    height: 30,
    left: 10,
    position: "absolute",
    right: 10,
  },
  alertDepthLayerBack: {
    bottom: -8,
    opacity: 0.48,
    transform: [{ scale: 0.94 }],
  },
  alertDepthLayerMid: {
    bottom: -4,
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  alertStackItem: {
    paddingBottom: 12,
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.025,
    shadowRadius: 6,
  },
  assistantButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
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
    paddingTop: 0,
    paddingBottom: 100,
  },
  deviceAvatar: {
    alignItems: "center",
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  deviceId: {
    color: COLORS.textSecondary,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
  },
  deviceList: {
    gap: SPACING.sm,
  },
  deviceMoisture: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  deviceName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  deviceRowCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 0.5,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.035,
    shadowRadius: 9,
  },
  deviceRowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    minWidth: 0,
  },
  deviceRowRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: SPACING.sm,
  },
  deviceTitleWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
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
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  headerLogo: {
    height: 40,
    width: 128,
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
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 88,
    padding: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 4,
    textAlign: "center",
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
    textAlign: "center",
  },
  viewAll: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
