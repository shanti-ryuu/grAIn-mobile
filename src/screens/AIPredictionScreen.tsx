import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DeviceSummary, SensorReading } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { useAIPrediction } from "@/hooks/useAIPrediction";
import { useDevices } from "@/hooks/useDevices";
import { useWeather } from "@/hooks/useWeather";
import { chartConfig } from "@/utils/chart";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData, relativeTime } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";
import { grainApi } from "@/api/grain-api-client";

function badgeColor(type?: string): string {
  if (type === "critical") {
    return COLORS.danger;
  }
  if (type === "warning") {
    return COLORS.warning;
  }
  return COLORS.success;
}

function scoreColor(score: number): string {
  if (score > 80) {
    return COLORS.success;
  }
  if (score >= 50) {
    return COLORS.warning;
  }
  return COLORS.danger;
}

function EfficiencyRing({ score }: { score: number }) {
  const { theme } = useTheme();
  const animated = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, score));

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [animated, clamped]);

  const borderWidth = animated.interpolate({
    inputRange: [0, 100],
    outputRange: [5, 14],
  });

  return (
    <Animated.View style={[styles.ring, { borderColor: scoreColor(clamped), borderWidth }]}>
      <Text style={[styles.ringValue, { color: theme.textPrimary }]}>{clamped.toFixed(0)}</Text>
      <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>score</Text>
    </Animated.View>
  );
}

export function AIPredictionScreen() {
  const { devices } = useDevices();
  const { prediction, isLoading, error, lastFetchedAt, predict } = useAIPrediction();
  const weatherQuery = useWeather(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSummary | null>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const width = Dimensions.get("window").width - 32;

  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  const fetchPrediction = async () => {
    if (!selectedDevice) {
      return;
    }

    const latestResponse = await grainApi.sensors.getLatest(selectedDevice.deviceId);
    const latest = getListData<SensorReading>(latestResponse)[0];
    if (!latest) {
      return;
    }

    await predict({
      deviceId: selectedDevice.deviceId,
      temperature: latest.temperature,
      humidity: latest.humidity,
      moisture: latest.moisture,
      fanSpeed: latest.fanSpeed ?? 80,
      timeElapsed: 0,
      solarVoltage: latest.solarVoltage,
      energyConsumed: latest.energy,
      weatherContext: weatherQuery.weather
        ? {
            outdoorHumidity: weatherQuery.weather.current.humidity,
            outdoorTemperature: weatherQuery.weather.current.temperature,
            cloudCover: weatherQuery.weather.current.cloudCover,
            windSpeed: weatherQuery.weather.current.windSpeed,
          }
        : undefined,
    });
  };

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }
    if (!lastFetchedAt || Date.now() - lastFetchedAt > 120000) {
      void fetchPrediction();
    }
  }, [lastFetchedAt, selectedDevice]);

  const curve = useMemo(() => prediction?.projectedCurve?.slice(0, 13) ?? [], [prediction?.projectedCurve]);
  const chartLabels = curve.map((point, index) => (index % 2 === 0 ? String(point.minutesFromNow) : ""));
  const chartData = curve.map((point) => point.predictedMoisture);
  const recommendationColor = badgeColor(prediction?.recommendationType);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgBase }]} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>AI Prediction</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Forecast moisture and drying time.</Text>
        </View>
        {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {devices.map((device) => {
          const selected = selectedDevice?.deviceId === device.deviceId;
          return (
            <Pressable
              key={device._id}
              onPress={() => setSelectedDevice(device)}
              style={[
                styles.deviceChip,
                { backgroundColor: theme.bgCard, borderColor: theme.border },
                selected && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
              ]}
            >
              <Text style={[styles.deviceChipText, { color: theme.textPrimary }, selected && styles.deviceChipTextActive]}>{device.deviceId}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={styles.predictionCard}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>30 Minute Forecast</Text>
          {prediction ? <StatusBadge status={prediction.recommendationType} size="sm" /> : null}
        </View>
        <Text style={[styles.bigNumber, { color: recommendationColor }]}>
          {prediction ? `${prediction.predictedMoisture30min.toFixed(1)}%` : "--"}
        </Text>
        <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
          {prediction?.recommendation ?? "Select a device and fetch a prediction from current sensor data."}
        </Text>
        {prediction?.weatherEnhanced ? (
          <View style={styles.weatherBadge}>
            <Ionicons name="partly-sunny-outline" size={16} color={COLORS.primary} />
            <Text style={styles.weatherBadgeText}>Weather-Enhanced</Text>
          </View>
        ) : null}
        {prediction?.dryingConditionNote ? (
          <Text style={[styles.conditionNote, { color: theme.textSecondary }]}>{prediction.dryingConditionNote}</Text>
        ) : null}
        <View style={styles.metricRow}>
          <Text style={[styles.metricText, { color: theme.textSecondary }]}>Confidence: {prediction ? `${prediction.confidence.toFixed(0)}%` : "--"}</Text>
          <Text style={[styles.metricText, { color: theme.textSecondary }]}>Algorithm: {prediction?.algorithm ?? "--"}</Text>
        </View>
        {prediction?.confidenceInterval ? (
          <View style={[styles.intervalBox, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
            <Text style={[styles.intervalLabel, { color: theme.textSecondary }]}>Confidence interval</Text>
            <Text style={[styles.intervalValue, { color: theme.textPrimary }]}>
              {prediction.confidenceInterval.lowerMoisture.toFixed(1)}% - {prediction.confidenceInterval.upperMoisture.toFixed(1)}%
            </Text>
            <Text style={[styles.conditionNote, { color: theme.textSecondary }]}>
              +/-{prediction.confidenceInterval.margin.toFixed(1)} moisture points at {prediction.confidenceInterval.confidenceLevel.toFixed(0)}% confidence.
            </Text>
          </View>
        ) : null}
        {error ? <Text style={styles.warningText}>Using fallback: {error}</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Time to Target</Text>
        <Text style={[styles.countdown, { color: theme.textPrimary }]}>
          {prediction ? `~${prediction.estimatedMinutesToTarget} min remaining` : "--"}
        </Text>
        {prediction?.isDryingComplete ? (
          <View style={styles.completeRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.completeText}>Drying complete. Stop the dryer.</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Projected Curve</Text>
        {chartData.length > 1 ? (
          <>
            <LineChart
              bezier
              chartConfig={chartConfig(theme, theme.statusOnline)}
              data={{
                labels: chartLabels,
                datasets: [
                  { data: chartData },
                  {
                    data: chartData.map(() => 14),
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
            <Text style={styles.targetLabel}>Target moisture: 14%</Text>
          </>
        ) : (
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>No projected curve yet.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.scoreWrap}>
          <EfficiencyRing score={prediction?.efficiencyScore ?? 0} />
          <View style={styles.scoreTextWrap}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Efficiency Score</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Higher scores mean the dryer is operating closer to target conditions.</Text>
          </View>
        </View>
      </Card>

      <Pressable disabled={!selectedDevice || isLoading} onPress={() => void fetchPrediction()} style={styles.refreshButton}>
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.refreshText}>Get New Prediction</Text>
      </Pressable>

      <Card style={styles.card}>
        <Pressable style={styles.rowBetween} onPress={() => setMetricsOpen((open) => !open)}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Model Metrics</Text>
          <Ionicons name={metricsOpen ? "chevron-up" : "chevron-down"} size={22} color={theme.textPrimary} />
        </Pressable>
        {metricsOpen ? (
          <View style={styles.metricsBox}>
            <Text style={[styles.metricText, { color: theme.textSecondary }]}>
              R2 score: {(prediction?.modelMetrics?.moistureR2_ensemble ?? prediction?.modelMetrics?.moistureR2)?.toFixed(4) ?? "--"}
            </Text>
            <Text style={[styles.metricText, { color: theme.textSecondary }]}>Selected model: {prediction?.modelSelection?.selectedModel ?? prediction?.algorithm ?? "--"}</Text>
            <Text style={[styles.metricText, { color: theme.textSecondary }]}>{prediction?.modelSelection?.reason ?? "Model selection details unavailable."}</Text>
            <Text style={[styles.metricText, { color: theme.textSecondary }]}>Last updated: {lastFetchedAt ? relativeTime(lastFetchedAt) : "--"}</Text>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bigNumber: {
    fontSize: 46,
    fontWeight: "900",
  },
  bodyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  chart: {
    borderRadius: 14,
    marginLeft: -SPACING.md,
  },
  completeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  completeText: {
    color: COLORS.success,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  conditionNote: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
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
  countdown: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: "900",
  },
  deviceChip: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  deviceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  deviceChipText: {
    color: COLORS.textPrimary,
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "900",
  },
  deviceChipTextActive: {
    color: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  intervalBox: {
    borderRadius: 14,
    borderWidth: 0.5,
    gap: 3,
    padding: SPACING.md,
  },
  intervalLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  intervalValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  metricsBox: {
    gap: SPACING.sm,
  },
  metricText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  predictionCard: {
    gap: SPACING.sm,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    paddingVertical: 15,
  },
  refreshText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  ring: {
    alignItems: "center",
    borderRadius: 46,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  ringLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  ringValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreTextWrap: {
    flex: 1,
    gap: SPACING.xs,
  },
  scoreWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  targetLabel: {
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
  warningText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  weatherBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weatherBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
  },
});
