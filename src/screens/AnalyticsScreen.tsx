import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { AnalyticsOverview, AnalyticsSessionRank, DeviceSummary, SessionSummary, grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDevices } from "@/hooks/useDevices";
import { useDryingSessions } from "@/hooks/useDryingSessions";
import { chartConfig } from "@/utils/chart";
import { COLORS, SPACING } from "@/utils/constants";
import { generateAnalyticsReport, generateSessionReport, shareReport } from "@/utils/pdf-generator";
import { useBottomTabPadding } from "@/utils/layout";

type Period = "daily" | "weekly" | "monthly";
type KpiIconName = "chart" | "clock" | "energy" | "moisture" | "grain" | "success";

const emptyAnalytics: AnalyticsOverview = {
  totalSessions: 0,
  activeSessions: 0,
  completedSessions: 0,
  avgEfficiency: 0,
  avgDuration: 0,
  totalEnergyUsed: 0,
  totalDevices: 0,
  onlineDevices: 0,
  totalAlerts: 0,
  criticalAlerts: 0,
  recentSessions: [],
  moistureTrend: [],
  energyTrend: [],
};

function labelDate(value?: string): string {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(5);
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function durationMinutes(seconds?: number): string {
  return `${Math.round((seconds ?? 0) / 60)} min`;
}

function kpiColor(label: string, value: number): string {
  if (label !== "Avg Efficiency" && label !== "Success Rate") {
    return COLORS.primary;
  }
  if (value > 80) {
    return COLORS.success;
  }
  if (value > 60) {
    return COLORS.warning;
  }
  return COLORS.danger;
}

function KpiSvgIcon({ name, color }: { name: KpiIconName; color: string }) {
  const shared = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
  };

  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      {name === "chart" ? (
        <>
          <Line x1="4" x2="4" y1="19" y2="5" {...shared} />
          <Line x1="4" x2="20" y1="19" y2="19" {...shared} />
          <Polyline points="7 15 11 11 14 13 19 7" {...shared} />
        </>
      ) : null}
      {name === "clock" ? (
        <>
          <Circle cx="12" cy="12" r="8" {...shared} />
          <Path d="M12 8v4l3 2" {...shared} />
        </>
      ) : null}
      {name === "energy" ? <Path d="M13 2 4 14h7l-1 8 10-13h-7z" {...shared} /> : null}
      {name === "moisture" ? <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" {...shared} /> : null}
      {name === "grain" ? (
        <>
          <Path d="M7 17c6.5 0 10-4.5 10-10-6.5 0-10 4.5-10 10z" {...shared} />
          <Path d="M7 17 17 7" {...shared} />
          <Path d="M7 17c.5 2.2 2.2 3.5 5 4" {...shared} />
        </>
      ) : null}
      {name === "success" ? (
        <>
          <Rect height="16" rx="8" width="16" x="4" y="4" {...shared} />
          <Path d="m8.5 12 2.3 2.3 4.8-5" {...shared} />
        </>
      ) : null}
    </Svg>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: KpiIconName }) {
  const { theme } = useTheme();
  const numeric = Number.parseFloat(value);
  const iconColor = kpiColor(label, Number.isFinite(numeric) ? numeric : 0);
  return (
    <Card style={styles.kpiCard}>
      <View style={[styles.kpiIconBadge, { backgroundColor: `${iconColor}1A` }]}>
        <KpiSvgIcon color={iconColor} name={icon} />
      </View>
      <Text style={[styles.kpiValue, { color: iconColor }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Card>
  );
}

function DeviceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.deviceChip,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        selected && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
      ]}
    >
      <Text style={[styles.deviceChipText, { color: selected ? "#FFFFFF" : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function RankCard({ title, session }: { title: string; session?: AnalyticsSessionRank | null }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.rankCard}>
      <Text style={[styles.rankTitle, { color: theme.textPrimary }]}>{title}</Text>
      {session ? (
        <>
          <Text style={[styles.rankMetric, { color: theme.textPrimary }]}>Efficiency: {session.efficiency.toFixed(1)}%</Text>
          <Text style={[styles.rankText, { color: theme.textSecondary }]}>Duration: {durationMinutes(session.duration)}</Text>
          <Text style={[styles.rankText, { color: theme.textSecondary }]}>Moisture: {session.startMoisture}% to {session.finalMoisture}%</Text>
          <Text style={[styles.rankText, { color: theme.textSecondary }]}>{labelDate(session.startedAt)}</Text>
        </>
      ) : (
        <Text style={[styles.rankText, { color: theme.textSecondary }]}>No completed session yet.</Text>
      )}
    </Card>
  );
}

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>("daily");
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingSessionId, setExportingSessionId] = useState<string | null>(null);
  const [isExportingAnalytics, setIsExportingAnalytics] = useState(false);
  const { devices } = useDevices();
  const { sessions } = useDryingSessions(deviceId);
  const analyticsQuery = useAnalytics(period, deviceId);
  const analytics = analyticsQuery.data ?? emptyAnalytics;
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const width = Dimensions.get("window").width - 32;
  const chartWidth = Math.max(280, width - SPACING.md * 2);

  const kpis = analytics.kpis ?? {
    avgEfficiency: analytics.avgEfficiency,
    avgDryingTime: analytics.avgDuration,
    avgEnergyPerSession: analytics.totalSessions > 0 ? analytics.totalEnergyUsed / analytics.totalSessions : 0,
    avgMoistureReduction: 0,
    totalGrainDried: 0,
    successRate: analytics.totalSessions > 0 ? (analytics.completedSessions / analytics.totalSessions) * 100 : 0,
  };

  const labels = analytics.moistureTrend.map((point) => labelDate(point.date ?? point.timestamp)).slice(-6);
  const startMoistureValues = analytics.moistureTrend.map((point) => point.avgStartMoisture || 0).slice(-6);
  const finalMoistureValues = analytics.moistureTrend.map((point) => point.avgFinalMoisture || point.avgMoisture || 0).slice(-6);
  const energyValues = analytics.energyTrend.map((point) => point.totalEnergy || 0).slice(-6);
  const energyLabels = analytics.energyTrend.map((point) => labelDate(point.date ?? point.timestamp)).slice(-6);
  const efficiencyValues = (analytics.efficiencyTrend ?? []).map((point) => point.avgEfficiency || 0).slice(-6);
  const efficiencyLabels = (analytics.efficiencyTrend ?? []).map((point) => labelDate(point.date)).slice(-6);
  const breakdown = analytics.sessionBreakdown ?? {
    completed: analytics.completedSessions,
    active: analytics.activeSessions,
    aborted: Math.max(0, analytics.totalSessions - analytics.completedSessions - analytics.activeSessions),
  };

  const pieData = useMemo(
    () => [
      { name: `Completed (${breakdown.completed})`, population: breakdown.completed, color: COLORS.success, legendFontColor: theme.textSecondary, legendFontSize: 12 },
      { name: `Aborted (${breakdown.aborted})`, population: breakdown.aborted, color: COLORS.danger, legendFontColor: theme.textSecondary, legendFontSize: 12 },
      { name: `Active (${breakdown.active})`, population: breakdown.active, color: COLORS.info, legendFontColor: theme.textSecondary, legendFontSize: 12 },
    ],
    [breakdown.active, breakdown.aborted, breakdown.completed, theme.textSecondary],
  );

  const selectedDevice = devices.find((device) => device.deviceId === deviceId);

  async function exportAnalytics() {
    setIsExportingAnalytics(true);
    try {
      const report = await generateAnalyticsReport(analytics, {
        deviceName: selectedDevice?.name ?? deviceId ?? "All Devices",
        period,
      });
      await shareReport(report.uri, report.filename);
      setExportOpen(false);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsExportingAnalytics(false);
    }
  }

  async function exportSession(session: SessionSummary) {
    setExportingSessionId(session._id);
    try {
      const reportData = await grainApi.sessions.getReport(session._id);
      const report = await generateSessionReport(reportData);
      await shareReport(report.uri, report.filename);
      setExportOpen(false);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExportingSessionId(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Drying performance and report exports.</Text>
        </View>
        {analyticsQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={analyticsQuery.isLoading} onRefresh={analyticsQuery.refetch} tintColor={theme.accentPrimary} />
        }
      >
        <View style={styles.periodRow}>
          {(["daily", "weekly", "monthly"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setPeriod(item)}
              style={[
                styles.periodChip,
                { backgroundColor: theme.bgCard, borderColor: theme.border },
                period === item && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
              ]}
            >
              <Text style={[styles.periodText, { color: period === item ? "#FFFFFF" : theme.textSecondary }]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {devices.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deviceRow}>
            <DeviceChip label="All Devices" selected={!deviceId} onPress={() => setDeviceId(undefined)} />
            {devices.map((device: DeviceSummary) => (
              <DeviceChip
                key={device._id}
                label={device.name || device.deviceId}
                selected={device.deviceId === deviceId}
                onPress={() => setDeviceId(device.deviceId)}
              />
            ))}
          </ScrollView>
        ) : null}

        {analyticsQuery.error ? <Text style={styles.errorText}>{analyticsQuery.error}</Text> : null}

        {!analyticsQuery.isLoading && analytics.totalSessions === 0 ? (
          <EmptyState title="No session data yet" subtitle="Complete a drying session to unlock analytics." mood="happy" />
        ) : null}

        <View style={styles.kpiGrid}>
          <KpiCard icon="chart" label="Avg Efficiency" value={`${kpis.avgEfficiency.toFixed(1)}%`} />
          <KpiCard icon="clock" label="Avg Drying Time" value={`${kpis.avgDryingTime.toFixed(0)} min`} />
          <KpiCard icon="energy" label="Avg Energy" value={`${kpis.avgEnergyPerSession.toFixed(2)} kWh`} />
          <KpiCard icon="moisture" label="Avg Moisture ↓" value={`${kpis.avgMoistureReduction.toFixed(1)}%`} />
          <KpiCard icon="grain" label="Total Grain Dried" value={`${kpis.totalGrainDried.toFixed(1)} kg`} />
          <KpiCard icon="success" label="Success Rate" value={`${kpis.successRate.toFixed(1)}%`} />
        </View>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Moisture Reduction Trend</Text>
          {startMoistureValues.some(Boolean) || finalMoistureValues.some(Boolean) ? (
            <>
              <LineChart
                bezier
                chartConfig={chartConfig(theme, theme.statusOnline)}
                data={{
                  labels,
                  datasets: [
                    { data: startMoistureValues, color: () => COLORS.info, strokeWidth: 2 },
                    { data: finalMoistureValues, color: () => COLORS.success, strokeWidth: 2 },
                  ],
                  legend: ["Start", "Final"],
                }}
                height={210}
                style={styles.chart}
                width={chartWidth}
                yAxisSuffix="%"
              />
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No moisture trend data yet.</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Energy Consumption</Text>
          {energyValues.some((value) => value > 0) ? (
            <BarChart
              chartConfig={chartConfig(theme, theme.statusWarning)}
              data={{ labels: energyLabels, datasets: [{ data: energyValues }] }}
              fromZero
              height={190}
              showValuesOnTopOfBars
              style={styles.chart}
              width={chartWidth}
              yAxisLabel=""
              yAxisSuffix=" kWh"
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No energy data yet.</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Drying Efficiency Trend</Text>
          {efficiencyValues.some(Boolean) ? (
            <LineChart
              bezier
              chartConfig={chartConfig(theme, theme.statusOnline)}
              data={{
                labels: efficiencyLabels,
                datasets: [
                  { data: efficiencyValues },
                  { data: efficiencyValues.map(() => 80), color: () => COLORS.warning, strokeWidth: 2 },
                ],
                legend: ["Efficiency", "80% target"],
              }}
              height={210}
              style={styles.chart}
              width={chartWidth}
              yAxisSuffix="%"
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No efficiency trend data yet.</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Session Status</Text>
          {analytics.totalSessions > 0 ? (
            <PieChart
              accessor="population"
              backgroundColor="transparent"
              chartConfig={chartConfig(theme, theme.statusOnline)}
              data={pieData}
              height={190}
              paddingLeft="12"
              width={chartWidth}
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sessions yet.</Text>
          )}
        </Card>

        <View style={styles.rankRow}>
          <RankCard title="🏆 Best Session" session={analytics.bestSession} />
          <RankCard title="⚠️ Worst Session" session={analytics.worstSession} />
        </View>

        <Pressable onPress={() => setExportOpen(true)} style={styles.exportButton}>
          <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export PDF Report</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent animationType="slide" visible={exportOpen} onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Export PDF Report</Text>
            <Pressable disabled={isExportingAnalytics} onPress={() => void exportAnalytics()} style={styles.modalAction}>
              {isExportingAnalytics ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalActionText}>Overall Analytics Report</Text>}
            </Pressable>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Session Report</Text>
            <ScrollView style={styles.sessionPicker}>
              {sessions.slice(0, 12).map((session) => (
                <Pressable key={session._id} onPress={() => void exportSession(session)} style={[styles.sessionOption, { borderColor: theme.border }]}>
                  <Text style={[styles.sessionOptionTitle, { color: theme.textPrimary }]}>{session.deviceId} · {session.grainType}</Text>
                  <Text style={[styles.sessionOptionMeta, { color: theme.textSecondary }]}>{labelDate(session.startedAt ?? session.createdAt)} · {(session.efficiency ?? 0).toFixed(1)}%</Text>
                  {exportingSessionId === session._id ? <ActivityIndicator color={COLORS.primary} /> : null}
                </Pressable>
              ))}
              {sessions.length === 0 ? <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sessions available.</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setExportOpen(false)} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.md },
  cardTitle: { fontSize: 18, fontWeight: "900" },
  chart: { borderRadius: 14, marginLeft: -SPACING.md },
  closeButton: { alignItems: "center", paddingVertical: 12 },
  closeButtonText: { fontSize: 14, fontWeight: "900" },
  container: { flex: 1 },
  content: { gap: SPACING.md, padding: SPACING.md, paddingTop: 0, paddingBottom: 120 },
  deviceChip: { borderRadius: 999, borderWidth: 1, marginRight: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  deviceChipText: { fontSize: 13, fontWeight: "900" },
  deviceRow: { paddingRight: SPACING.md },
  emptyText: { fontSize: 14, fontWeight: "700" },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: "800" },
  exportButton: { alignItems: "center", backgroundColor: COLORS.primary, borderRadius: 18, flexDirection: "row", gap: SPACING.sm, justifyContent: "center", paddingVertical: 16 },
  exportButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: SPACING.md, paddingBottom: SPACING.sm },
  kpiCard: { flexBasis: "48%", gap: 4, minHeight: 112 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  kpiIconBadge: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", marginBottom: 4, width: 42 },
  kpiLabel: { fontSize: 12, fontWeight: "800" },
  kpiValue: { fontSize: 20, fontWeight: "900" },
  modalAction: { alignItems: "center", backgroundColor: COLORS.primary, borderRadius: 16, minHeight: 52, justifyContent: "center" },
  modalActionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  modalBackdrop: { backgroundColor: "rgba(17,24,39,0.48)", flex: 1, justifyContent: "flex-end" },
  modalLabel: { fontSize: 13, fontWeight: "900", marginTop: SPACING.sm, textTransform: "uppercase" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: SPACING.md, maxHeight: "82%", padding: SPACING.lg },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  periodChip: { alignItems: "center", borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 11 },
  periodRow: { flexDirection: "row", gap: SPACING.sm },
  periodText: { fontSize: 13, fontWeight: "900" },
  rankCard: { flex: 1, gap: 5 },
  rankMetric: { fontSize: 14, fontWeight: "900" },
  rankRow: { flexDirection: "row", gap: SPACING.sm },
  rankText: { fontSize: 12, fontWeight: "700" },
  rankTitle: { fontSize: 15, fontWeight: "900" },
  sessionOption: { borderBottomWidth: 1, gap: 3, paddingVertical: 12 },
  sessionOptionMeta: { fontSize: 12, fontWeight: "700" },
  sessionOptionTitle: { fontSize: 14, fontWeight: "900" },
  sessionPicker: { maxHeight: 260 },
  subtitle: { fontSize: 13, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "900" },
});
