import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CommandSummary, DeviceSummary, grainApi, SessionSummary } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { DryingChamberView } from "@/components/chamber/DryingChamberView";
import type { SwitchState } from "@/components/chamber/chamberTypes";
import { SensorCard } from "@/components/SensorCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { useRealtimeSensor } from "@/hooks/useRealtimeSensor";
import { useSensorData } from "@/hooks/useSensorData";
import { chartConfig, sparseClockLabels, uniqueChronologicalPoints } from "@/utils/chart";
import { COLORS, SENSOR_THRESHOLDS, SPACING } from "@/utils/constants";
import { getListData, relativeTime, sessionProgress } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";

function valueOrFallback(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function displayNumber(value: unknown, decimals = 1): string {
  const numberValue = valueOrFallback(value, Number.NaN);
  return Number.isFinite(numberValue) ? numberValue.toFixed(decimals) : "--";
}

function moistureColor(value: number): string {
  if (value <= SENSOR_THRESHOLDS.MOISTURE_TARGET) {
    return COLORS.success;
  }
  if (value <= SENSOR_THRESHOLDS.MOISTURE_WARNING) {
    return COLORS.warning;
  }
  return COLORS.danger;
}

function switchState(value: unknown): SwitchState {
  return value === "ON" ? "ON" : "OFF";
}

function ProgressBar({ progress }: { progress: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.bgElevated }]}>
      <View style={[styles.progressFill, { backgroundColor: theme.statusOnline, width: `${progress}%` }]} />
    </View>
  );
}

export function DeviceDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const deviceId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [commands, setCommands] = useState<CommandSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sensorData, runtimeState, isOnline, lastUpdated } = useRealtimeSensor(deviceId ?? "");
  const { data: sensorHistory, isLoading: isHistoryLoading } = useSensorData(deviceId ?? "");
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const bottomPadding = useBottomTabPadding(32);

  const loadDetail = useCallback(async () => {
    if (!deviceId) {
      return;
    }

    try {
      setError(null);
      const [deviceResponse, sessionsResponse, commandsResponse] = await Promise.allSettled([
        grainApi.devices.getById(deviceId),
        grainApi.sessions.getActive(deviceId),
        grainApi.commands.history(deviceId),
      ]);

      if (deviceResponse.status === "fulfilled") {
        setDevice(deviceResponse.value);
      }
      if (sessionsResponse.status === "fulfilled") {
        setActiveSession(getListData<SessionSummary>(sessionsResponse.value)[0] ?? null);
      }
      if (commandsResponse.status === "fulfilled") {
        setCommands(getListData<CommandSummary>(commandsResponse.value).slice(0, 5));
      }
      if (deviceResponse.status === "rejected") {
        setError(deviceResponse.reason instanceof Error ? deviceResponse.reason.message : "Unable to load device");
      }
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadDetail();
    const interval = setInterval(() => {
      void loadDetail();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDetail]);

  const mergedRuntime = useMemo(() => runtimeState ?? device?.runtimeState ?? null, [device?.runtimeState, runtimeState]);
  const latestSensorReading = sensorHistory[0] ?? null;
  const liveSensorData = sensorData ?? latestSensorReading;
  const temperature = valueOrFallback(liveSensorData?.temperature ?? mergedRuntime?.currentTemperature);
  const humidity = valueOrFallback(liveSensorData?.humidity ?? mergedRuntime?.currentHumidity);
  const moisture = valueOrFallback(liveSensorData?.moisture ?? device?.lastMoisture ?? mergedRuntime?.currentMoisture);
  const fanSpeed = valueOrFallback(liveSensorData?.fanSpeed);
  const solarVoltage = valueOrFallback(liveSensorData?.solarVoltage);
  const weight = valueOrFallback(liveSensorData?.weight ?? mergedRuntime?.currentWeight);
  const isRunning = mergedRuntime?.isRunning === true;
  const heaterState = switchState(mergedRuntime?.heaterState);
  const fan1State = switchState(mergedRuntime?.fan1State);
  const fan2State = switchState(mergedRuntime?.fan2State);
  const progress = activeSession
    ? sessionProgress(activeSession.startMoisture, moisture || activeSession.currentMoisture, activeSession.targetMoisture)
    : 0;

  const chartPoints = uniqueChronologicalPoints(sensorHistory).slice(-20);
  const chartLabels = sparseClockLabels(chartPoints);
  const chartValues = chartPoints.map((reading) => reading.moisture);
  const chartWidth = Dimensions.get("window").width - 32;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bgBase }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgBase }]} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{device?.name ?? "Device"}</Text>
          <Text style={[styles.deviceId, { color: theme.textSecondary }]}>{deviceId}</Text>
        </View>
        <StatusBadge status={isOnline} size="sm" />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isFocused ? (
        <DryingChamberView
          fan1State={fan1State}
          fan2State={fan2State}
          fanSpeed={fanSpeed}
          heaterState={heaterState}
          humidity={humidity}
          isRunning={isRunning}
          moisture={moisture}
          temperature={temperature}
          weight={weight}
        />
      ) : null}

      <View style={styles.sensorGrid}>
        <View style={styles.sensorTile}>
          <SensorCard
            color={temperature > SENSOR_THRESHOLDS.TEMP_DANGER ? COLORS.danger : COLORS.primary}
            icon="thermometer"
            label="Temperature"
            unit="C"
            value={displayNumber(temperature)}
          />
        </View>
        <View style={styles.sensorTile}>
          <SensorCard
            color={humidity > SENSOR_THRESHOLDS.HUMIDITY_WARNING ? COLORS.warning : COLORS.info}
            icon="water"
            label="Humidity"
            unit="%"
            value={displayNumber(humidity)}
          />
        </View>
        <View style={styles.sensorTile}>
          <SensorCard color={moistureColor(moisture)} icon="leaf" label="Moisture" unit="%" value={displayNumber(moisture)} />
        </View>
        <View style={styles.sensorTile}>
          <SensorCard color={COLORS.info} icon="speedometer" label="Fan Speed" unit="%" value={displayNumber(fanSpeed, 0)} />
        </View>
        <View style={styles.sensorTile}>
          <SensorCard color={COLORS.warning} icon="flash" label="Solar Voltage" unit="V" value={displayNumber(solarVoltage)} />
        </View>
        <View style={styles.sensorTile}>
          <SensorCard color={COLORS.textSecondary} icon="scale" label="Weight" unit="kg" value={displayNumber(weight)} />
        </View>
      </View>

      <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>Last updated: {relativeTime(lastUpdated ?? latestSensorReading?.timestamp ?? device?.lastActive)}</Text>

      {activeSession ? (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTop}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Drying Progress</Text>
            <StatusBadge status="active" size="sm" />
          </View>
          <ProgressBar progress={progress} />
          <View style={styles.progressMeta}>
            <Text style={[styles.progressText, { color: theme.textPrimary }]}>{progress.toFixed(0)}% complete</Text>
            <Text style={[styles.progressText, { color: theme.textPrimary }]}>
              {displayNumber(moisture)}% / {displayNumber(activeSession.targetMoisture, 0)}%
            </Text>
          </View>
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Efficiency estimate: {displayNumber(activeSession.efficiency ?? progress, 0)}%
          </Text>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <View style={styles.sectionTop}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sensor History</Text>
          {isHistoryLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        </View>
        {chartValues.length > 1 ? (
          <LineChart
            bezier
            chartConfig={chartConfig(theme, theme.statusOnline)}
            data={{
              labels: chartLabels,
              datasets: [
                { data: chartValues },
                {
                  data: chartValues.map(() => 14),
                  color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            height={180}
            style={styles.chart}
            width={chartWidth}
            yAxisSuffix="%"
          />
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Not enough readings for a moisture chart yet.</Text>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Command History</Text>
        <View style={styles.commandList}>
          {commands.length > 0 ? (
            commands.map((command) => (
              <View key={command._id} style={styles.commandRow}>
                <View style={styles.commandTextWrap}>
                <Text style={[styles.commandStr, { color: theme.textPrimary }]}>{command.commandStr}</Text>
                  <Text style={[styles.commandTime, { color: theme.textSecondary }]}>{relativeTime(command.createdAt)}</Text>
                </View>
                <StatusBadge status={command.status} size="sm" />
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent commands.</Text>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  centered: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
  chart: {
    borderRadius: 14,
    marginLeft: -SPACING.md,
  },
  commandList: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  commandRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: SPACING.sm,
  },
  commandStr: {
    color: COLORS.textPrimary,
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "900",
  },
  commandTextWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  commandTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  deviceId: {
    color: COLORS.textSecondary,
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  headerText: {
    flex: 1,
  },
  lastUpdated: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: SPACING.sm,
  },
  progressFill: {
    backgroundColor: COLORS.success,
    borderRadius: 999,
    height: "100%",
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  sectionCard: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  sensorTile: {
    width: "48.5%",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: "900",
  },
});
