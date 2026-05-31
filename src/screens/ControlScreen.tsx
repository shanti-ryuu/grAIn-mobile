import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { grainApi, PredictionResponse, SensorReading } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { CommandStatusBanner } from "@/components/CommandStatusBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { useDevices } from "@/hooks/useDevices";
import { useDryerControl } from "@/hooks/useDryerControl";
import { useFanControl } from "@/hooks/useFanControl";
import { useOfflineGuard } from "@/hooks/useOfflineGuard";
import { useRealtimeSensor } from "@/hooks/useRealtimeSensor";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";

type OnOff = "ON" | "OFF";
type FanTarget = "FAN1" | "FAN2" | "ALL";
type StepperAction = "START" | "STOP" | "CW" | "CCW";

function SegmentedMode({
  mode,
  onChange,
  disabled,
  onBlocked,
}: {
  mode: "AUTO" | "MANUAL";
  onChange: (mode: "AUTO" | "MANUAL") => void;
  disabled?: boolean;
  onBlocked?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.bgElevated, opacity: disabled ? 0.55 : 1 }]}>
      {(["AUTO", "MANUAL"] as const).map((item) => (
        <Pressable
          key={item}
          onPress={() => {
            if (disabled) {
              onBlocked?.();
              return;
            }
            onChange(item);
          }}
          style={[styles.segmentButton, mode === item && { backgroundColor: theme.accentPrimary }]}
        >
          <Text style={[styles.segmentText, { color: mode === item ? "#FFFFFF" : theme.textSecondary }]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleControlRow({
  label,
  value,
  onChange,
  disabled,
  isLoading,
  onBlocked,
}: {
  label: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
  disabled: boolean;
  isLoading: boolean;
  onBlocked?: () => void;
}) {
  const { theme } = useTheme();
  const press = () => {
    if (disabled) {
      onBlocked?.();
      return;
    }
    onChange(!value);
  };
  return (
    <View style={styles.controlRow}>
      <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{label}</Text>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: disabled || isLoading }}
        disabled={isLoading}
        onPress={press}
        style={[
          styles.toggleTrack,
          { backgroundColor: value ? COLORS.success : COLORS.danger },
          (disabled || isLoading) && styles.disabledButton,
        ]}
      >
        <Text style={styles.toggleText}>{value ? "ON" : "OFF"}</Text>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </Pressable>
    </View>
  );
}

function runtimeSwitch(runtimeState: Record<string, unknown> | null | undefined, key: string): boolean {
  return runtimeState?.[key] === "ON";
}

export function ControlScreen() {
  const { devices, isLoading: devicesLoading } = useDevices();
  const {
    mode,
    isRunning,
    temperature,
    fanSpeed,
    isControlling,
    commandStatus,
    selectedDevice,
    selectedDeviceId,
    setMode,
    setTemperature,
    setFanSpeed,
    setSelectedDevice,
    setCommandStatus,
    handleStart,
    handleStop,
  } = useDryerControl();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [fan1On, setFan1On] = useState(false);
  const [fan2On, setFan2On] = useState(false);
  const [heaterOn, setHeaterOn] = useState(false);
  const [relayOn, setRelayOn] = useState(false);
  const realtimeSensor = useRealtimeSensor(selectedDevice?.deviceId);
  const selectedDeviceOnline = realtimeSensor.isOnline ?? (selectedDevice?.status === "online");
  const selectedRuntimeState = realtimeSensor.runtimeState ?? selectedDevice?.runtimeState ?? null;
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const { canInteract, guard, warnOffline } = useOfflineGuard(Boolean(selectedDeviceOnline));
  const fanControls = useFanControl(selectedDevice?.deviceId ?? "");
  const lastCommandStr = useMemo(() => {
    if (!selectedDevice) {
      return undefined;
    }
    if (isRunning) {
      return `START:${mode}:${temperature}:${fanSpeed}`;
    }
    return "STOP";
  }, [fanSpeed, isRunning, mode, selectedDevice, temperature]);

  useEffect(() => {
    if (!selectedDevice && selectedDeviceId && devices.length > 0) {
      const match = devices.find((device) => device.deviceId === selectedDeviceId);
      if (match) {
        setSelectedDevice(match);
      }
    }
    if (!selectedDevice && !selectedDeviceId && devices.length > 0) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice, selectedDeviceId, setSelectedDevice]);

  useEffect(() => {
    setFan1On(runtimeSwitch(selectedRuntimeState, "fan1State"));
    setFan2On(runtimeSwitch(selectedRuntimeState, "fan2State"));
    setHeaterOn(runtimeSwitch(selectedRuntimeState, "heaterState"));
    setRelayOn(runtimeSwitch(selectedRuntimeState, "relayState"));
  }, [selectedRuntimeState]);

  const fetchPrediction = useCallback(async () => {
    if (mode !== "AUTO" || !selectedDevice) {
      return;
    }

    setIsPredicting(true);
    try {
      const latestResponse = await grainApi.sensors.getLatest(selectedDevice.deviceId);
      const latest = getListData<SensorReading>(latestResponse)[0];
      if (!latest) {
        setPrediction(null);
        return;
      }

      const result = await grainApi.ai.predict({
        deviceId: selectedDevice.deviceId,
        temperature: latest.temperature,
        humidity: latest.humidity,
        moisture: latest.moisture,
        fanSpeed: latest.fanSpeed ?? fanSpeed,
        timeElapsed: 0,
        solarVoltage: latest.solarVoltage ?? 0,
        energyConsumed: latest.energy ?? 0,
      });
      setPrediction(result);
    } catch {
      setPrediction(null);
    } finally {
      setIsPredicting(false);
    }
  }, [fanSpeed, mode, selectedDevice]);

  useEffect(() => {
    void fetchPrediction();
  }, [fetchPrediction]);

  const runFanControl = async (target: FanTarget, action: OnOff) => {
    try {
      await fanControls.controlFan(target, action);
      const nextValue = action === "ON";
      if (target === "FAN1" || target === "ALL") {
        setFan1On(nextValue);
      }
      if (target === "FAN2" || target === "ALL") {
        setFan2On(nextValue);
      }
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runRelay = async (action: OnOff) => {
    try {
      await fanControls.controlRelay(action);
      setRelayOn(action === "ON");
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runHeater = async (action: OnOff) => {
    try {
      await fanControls.controlHeater(action);
      setHeaterOn(action === "ON");
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runStepper = async (action: StepperAction) => {
    try {
      await fanControls.controlStepper(action);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const startOrStop = async () => {
    if (!selectedDevice) {
      return;
    }

    if (isRunning) {
      await handleStop(selectedDevice.deviceId);
    } else {
      await handleStart(selectedDevice.deviceId, mode, temperature, fanSpeed);
    }
  };

  const controlDisabled = !selectedDevice || !canInteract || fanControls.isLoading;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgBase }]} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Dryer Control</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select a dryer and send hardware-safe commands.</Text>
        </View>
        {devicesLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Device</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceScroller}>
        {devices.length > 0 ? (
          devices.map((device) => {
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
                <View style={[styles.statusDot, { backgroundColor: selected && selectedDeviceOnline ? COLORS.success : device.status === "online" ? COLORS.success : COLORS.idle }]} />
                <View>
                  <Text style={[styles.deviceChipName, { color: theme.textPrimary }, selected && styles.deviceChipTextActive]}>{device.name}</Text>
                  <Text style={[styles.deviceChipId, { color: theme.textSecondary }, selected && styles.deviceChipTextActive]}>{device.deviceId}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No devices available.</Text>
        )}
      </ScrollView>

      {selectedDevice ? (
        <Card style={styles.selectedCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardTitle}>{selectedDevice.name}</Text>
              <Text style={styles.cardSubtitle}>{selectedDevice.deviceId}</Text>
            </View>
            <StatusBadge status={selectedDeviceOnline ? "online" : "offline"} size="sm" />
          </View>
        </Card>
      ) : null}

      <CommandStatusBanner
        commandStr={lastCommandStr}
        onAutoHide={() => setCommandStatus("idle")}
        status={commandStatus}
      />

      <Card style={styles.panel}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mode</Text>
        <SegmentedMode disabled={!canInteract} mode={mode} onBlocked={warnOffline} onChange={setMode} />
        {mode === "AUTO" ? (
          <Card style={styles.aiCard}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>AI Prediction</Text>
              {isPredicting ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="sparkles" size={21} color={COLORS.primary} />}
            </View>
            {prediction ? (
              <>
                <Text style={styles.aiMetric}>30 min moisture: {prediction.predictedMoisture30min.toFixed(1)}%</Text>
                <Text style={styles.aiMetric}>Time to target: {prediction.estimatedMinutesToTarget} min</Text>
                <Text style={styles.cardSubtitle}>{prediction.recommendation}</Text>
              </>
            ) : (
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Prediction appears when recent sensor data is available.</Text>
            )}
            <Text style={styles.autoStopText}>AI will auto-stop when moisture reaches 14%.</Text>
            <Pressable onPress={() => router.push("/(app)/ai-prediction")} style={styles.aiShortcut}>
              <Ionicons name="analytics" size={18} color={COLORS.primary} />
              <Text style={styles.aiShortcutText}>Open AI Prediction</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <View style={styles.sliderBlock}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Temperature (C)</Text>
                <Text style={styles.sliderValue}>{temperature}</Text>
              </View>
              <Slider
                disabled={isRunning || !canInteract}
                maximumTrackTintColor={theme.border}
                maximumValue={75}
                minimumTrackTintColor={COLORS.primary}
                minimumValue={35}
                onValueChange={setTemperature}
                step={1}
                thumbTintColor={COLORS.primary}
                value={temperature}
              />
            </View>

            <View style={styles.sliderBlock}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Fan Speed (%)</Text>
                <Text style={styles.sliderValue}>{fanSpeed}</Text>
              </View>
              <Slider
                disabled={isRunning || !canInteract}
                maximumTrackTintColor={theme.border}
                maximumValue={100}
                minimumTrackTintColor={COLORS.primary}
                minimumValue={0}
                onValueChange={setFanSpeed}
                step={5}
                thumbTintColor={COLORS.primary}
                value={fanSpeed}
              />
            </View>
          </>
        )}
      </Card>

      <Pressable
        disabled={isControlling}
        onPress={guard(startOrStop)}
        style={[
          styles.primaryButton,
          isRunning ? styles.stopButton : styles.startButton,
          (!selectedDevice || !canInteract || isControlling) && styles.disabledButton,
        ]}
      >
        {isControlling ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>{isRunning ? "Stop Drying" : "Start Drying"}</Text>
        )}
      </Pressable>

      {!selectedDeviceOnline && selectedDevice ? (
        <Text style={styles.warningText}>Device is offline. Controls are disabled until it reconnects.</Text>
      ) : null}

      {mode === "MANUAL" ? (
        <>
          <Card style={styles.panel}>
            <Text style={styles.sectionTitle}>Fan Control</Text>
            <ToggleControlRow
              disabled={controlDisabled}
              isLoading={fanControls.isLoading}
              label="FAN1"
              onBlocked={warnOffline}
              onChange={(nextValue) => void runFanControl("FAN1", nextValue ? "ON" : "OFF")}
              value={fan1On}
            />
            <ToggleControlRow
              disabled={controlDisabled}
              isLoading={fanControls.isLoading}
              label="FAN2"
              onBlocked={warnOffline}
              onChange={(nextValue) => void runFanControl("FAN2", nextValue ? "ON" : "OFF")}
              value={fan2On}
            />
            <ToggleControlRow
              disabled={controlDisabled}
              isLoading={fanControls.isLoading}
              label="ALL"
              onBlocked={warnOffline}
              onChange={(nextValue) => void runFanControl("ALL", nextValue ? "ON" : "OFF")}
              value={fan1On && fan2On}
            />
          </Card>

          <Card style={styles.panel}>
            <Pressable style={styles.advancedHeader} onPress={() => setAdvancedOpen((open) => !open)}>
              <Text style={styles.sectionTitle}>Advanced Controls</Text>
              <Ionicons name={advancedOpen ? "chevron-up" : "chevron-down"} size={22} color={theme.textPrimary} />
            </Pressable>
            {advancedOpen ? (
              <View style={styles.advancedContent}>
                <ToggleControlRow
                  disabled={controlDisabled}
                  isLoading={fanControls.isLoading}
                  label="Heater"
                  onBlocked={warnOffline}
                  onChange={(nextValue) => void runHeater(nextValue ? "ON" : "OFF")}
                  value={heaterOn}
                />
                <ToggleControlRow
                  disabled={controlDisabled}
                  isLoading={fanControls.isLoading}
                  label="Relay Auger"
                  onBlocked={warnOffline}
                  onChange={(nextValue) => void runRelay(nextValue ? "ON" : "OFF")}
                  value={relayOn}
                />
                <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>Stepper</Text>
                <View style={styles.stepperGrid}>
                  {(["START", "STOP", "CW", "CCW"] as const).map((action) => (
                    <Pressable
                      key={action}
                      onPress={controlDisabled ? () => warnOffline() : () => void runStepper(action)}
                      style={[styles.stepperButton, controlDisabled && styles.disabledButton]}
                    >
                      <Text style={styles.stepperText}>{action}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  advancedContent: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  advancedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aiCard: {
    backgroundColor: "#F0FDF4",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  aiMetric: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  aiShortcut: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  aiShortcutText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  autoStopText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
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
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  controlLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  controlRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deviceChip: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginRight: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  deviceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  deviceChipId: {
    color: COLORS.textSecondary,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
  },
  deviceChipName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  deviceChipTextActive: {
    color: "#FFFFFF",
  },
  deviceScroller: {
    marginRight: -SPACING.md,
  },
  disabledButton: {
    opacity: 0.45,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  panel: {
    gap: SPACING.md,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  segment: {
    backgroundColor: "#EEF2F7",
    borderRadius: 14,
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    paddingVertical: 11,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  selectedCard: {
    gap: SPACING.sm,
  },
  sliderBlock: {
    gap: SPACING.sm,
  },
  sliderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  sliderValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  startButton: {
    backgroundColor: COLORS.success,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexBasis: "48%",
    paddingVertical: 12,
  },
  stepperGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  stepperText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  stopButton: {
    backgroundColor: COLORS.danger,
  },
  toggleThumb: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    height: 28,
    position: "absolute",
    top: 4,
    width: 28,
  },
  toggleThumbOff: {
    left: 4,
  },
  toggleThumbOn: {
    right: 4,
  },
  toggleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  toggleTrack: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: SPACING.md,
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
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
