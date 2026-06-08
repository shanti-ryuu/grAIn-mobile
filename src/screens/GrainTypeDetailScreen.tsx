import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BarChart } from "react-native-chart-kit";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { useTheme } from "@/context/ThemeContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { chartConfig } from "@/utils/chart";
import { COLORS, SPACING } from "@/utils/constants";
import { useBottomTabPadding } from "@/utils/layout";

type Period = "daily" | "weekly" | "monthly";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parsePeriod(value: unknown): Period {
  return value === "daily" || value === "weekly" || value === "monthly" ? value : "monthly";
}

function StatTile({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function GrainTypeDetailScreen() {
  const params = useLocalSearchParams<{ type?: string; period?: string; deviceId?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const period = parsePeriod(params.period);
  const deviceId = params.deviceId ? String(params.deviceId) : undefined;
  const grainType = String(params.type ?? "rice");
  const analyticsQuery = useAnalytics(period, deviceId);
  const item = analyticsQuery.data?.grainTypeComparison?.find((entry) => entry.grainType === grainType);
  const bottomPadding = useBottomTabPadding(36);
  const chartWidth = Math.max(280, Dimensions.get("window").width - 64);

  const chartValues = [
    item?.avgEfficiency ?? 0,
    item?.successRate ?? 0,
    item?.avgMoistureReduction ?? 0,
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.bgCard }]}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{titleCase(grainType)} Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Detailed grain type performance.</Text>
        </View>
        {analyticsQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={<RefreshControl refreshing={analyticsQuery.isLoading} onRefresh={analyticsQuery.refetch} tintColor={theme.accentPrimary} />}
      >
        <View style={styles.statGrid}>
          <StatTile label="Sessions" value={String(item?.sessionCount ?? 0)} />
          <StatTile label="Avg Efficiency" value={`${(item?.avgEfficiency ?? 0).toFixed(1)}%`} />
          <StatTile label="Avg Time" value={`${(item?.avgDryingTime ?? 0).toFixed(0)} min`} />
          <StatTile label="Success Rate" value={`${(item?.successRate ?? 0).toFixed(1)}%`} />
        </View>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Performance Chart</Text>
          {item && item.sessionCount > 0 ? (
            <BarChart
              chartConfig={chartConfig(theme, theme.accentPrimary)}
              data={{
                labels: ["Eff", "Success", "Moisture"],
                datasets: [{ data: chartValues }],
              }}
              fromZero
              height={220}
              showValuesOnTopOfBars
              style={styles.chart}
              width={chartWidth}
              yAxisLabel=""
              yAxisSuffix="%"
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No {titleCase(grainType)} sessions yet.</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Drying Notes</Text>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            Average energy use is {(item?.avgEnergyUsed ?? 0).toFixed(2)} kWh per completed session, with an average moisture reduction of{" "}
            {(item?.avgMoistureReduction ?? 0).toFixed(1)}%.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyText: { fontSize: 14, fontWeight: "700", lineHeight: 21 },
  card: { gap: SPACING.md },
  cardTitle: { fontSize: 18, fontWeight: "900" },
  chart: { borderRadius: 14, marginLeft: -SPACING.sm },
  container: { flex: 1 },
  content: { gap: SPACING.md, padding: SPACING.md, paddingTop: 0 },
  emptyText: { fontSize: 14, fontWeight: "800" },
  header: { alignItems: "center", flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, paddingBottom: SPACING.sm },
  headerText: { flex: 1 },
  iconButton: { alignItems: "center", borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  statLabel: { fontSize: 12, fontWeight: "800" },
  statTile: { borderRadius: 18, borderWidth: 0.5, flexBasis: "48%", gap: 4, minHeight: 92, padding: SPACING.md },
  statValue: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "900" },
});
