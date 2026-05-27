import { BarChart, LineChart } from "react-native-chart-kit";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AnalyticsOverview, grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeContext";
import { chartConfig, sparseClockLabels, uniqueChronologicalPoints } from "@/utils/chart";
import { COLORS, SPACING } from "@/utils/constants";
import { useBottomTabPadding } from "@/utils/layout";

type Period = "daily" | "weekly" | "monthly";

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

function StatBox({ label, value }: { label: string; value: string | number }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.statBox}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Card>
  );
}

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>("daily");
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const width = Dimensions.get("window").width - 32;

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const result = await grainApi.analytics.getOverview(period);
      setAnalytics(result);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshAnalytics = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  const moisturePoints = useMemo(() => uniqueChronologicalPoints(analytics.moistureTrend), [analytics.moistureTrend]);
  const energyPoints = useMemo(() => uniqueChronologicalPoints(analytics.energyTrend), [analytics.energyTrend]);
  const moistureLabels = useMemo(() => sparseClockLabels(moisturePoints), [moisturePoints]);
  const moistureValues = moisturePoints.map((point) => point.avgMoisture);
  const energyLabels = sparseClockLabels(energyPoints);
  const energyValues = energyPoints.map((point) => point.totalEnergy);
  const abortedSessions = Math.max(0, analytics.totalSessions - analytics.completedSessions - analytics.activeSessions);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bgBase }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshAnalytics} tintColor={theme.accentPrimary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Drying performance and energy trends.</Text>
        </View>
        {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isLoading && analytics.totalSessions === 0 ? (
        <EmptyState
          title="Not enough data yet"
          subtitle="Complete a few drying sessions to see analytics and trends."
        />
      ) : null}

      <View style={styles.statsGrid}>
        <StatBox label="Total Sessions" value={analytics.totalSessions} />
        <StatBox label="Avg Efficiency" value={`${analytics.avgEfficiency.toFixed(0)}%`} />
        <StatBox label="Total Energy" value={`${analytics.totalEnergyUsed.toFixed(1)} kWh`} />
        <StatBox label="Avg Duration" value={`${analytics.avgDuration.toFixed(0)} min`} />
      </View>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Moisture Trend</Text>
        {moistureValues.length > 1 ? (
          <>
            <LineChart
              bezier
              chartConfig={chartConfig(theme, theme.statusOnline)}
              data={{
                labels: moistureLabels,
                datasets: [
                  { data: moistureValues },
                  {
                    data: moistureValues.map(() => 14),
                    color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              height={200}
              style={styles.chart}
              width={width}
              yAxisSuffix="%"
            />
            <Text style={[styles.targetText, { color: theme.statusDanger }]}>Target line: 14%</Text>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No moisture trend data yet.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Sessions by Status</Text>
        <View style={styles.statusRow}>
          <StatusStat color={COLORS.success} label="Completed" value={analytics.completedSessions} />
          <StatusStat color={COLORS.info} label="Active" value={analytics.activeSessions} />
          <StatusStat color={COLORS.danger} label="Aborted" value={abortedSessions} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Energy Usage</Text>
        {energyValues.length > 0 ? (
          <BarChart
            chartConfig={chartConfig(theme, theme.statusWarning)}
            data={{ labels: energyLabels, datasets: [{ data: energyValues }] }}
            fromZero
            height={180}
            showValuesOnTopOfBars
            style={styles.chart}
            width={width}
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No energy data yet.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

function StatusStat({ color, label, value }: { color: string; label: string; value: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.statusStat}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  chart: {
    borderRadius: 14,
    marginLeft: -SPACING.md,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    padding: SPACING.md,
    paddingBottom: 120,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  periodChip: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  periodChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "900",
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  statBox: {
    flexBasis: "48%",
    gap: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusStat: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  statusValue: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  targetText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
});
