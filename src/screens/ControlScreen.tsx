import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { useWeather } from "@/hooks/useWeather";
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
  const { isDark, theme } = useTheme();
  return (
    <View style={[styles.segment, { opacity: disabled ? 0.55 : 1 }]}>
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
          style={[
            styles.segmentButton,
            mode === item && styles.segmentButtonSelected,
            mode === item && isDark && styles.segmentButtonSelectedDark,
          ]}
        >
          <Text style={[styles.segmentText, { color: mode === item ? theme.textPrimary : theme.textSecondary }]}>{item}</Text>
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
  const [weatherConfirmOpen, setWeatherConfirmOpen] = useState(false);
  const realtimeSensor = useRealtimeSensor(selectedDevice?.deviceId);
  const weatherQuery = useWeather(true);
  const selectedDeviceOnline = realtimeSensor.isOnline ?? (selectedDevice?.status === "online");
  const selectedRuntimeState = realtimeSensor.runtimeState ?? selectedDevice?.runtimeState ?? null;
  const { isDark, theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const controlCardBg = isDark ? "#1C1C1E" : theme.bgCard;
  const controlCardBorder = isDark ? "#2C2C2E" : theme.border;
  const mutedPanelBg = isDark ? "#121214" : "#F3F4F6";
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
        weatherContext: weatherQuery.weather
          ? {
              outdoorHumidity: weatherQuery.weather.current.humidity,
              outdoorTemperature: weatherQuery.weather.current.temperature,
              cloudCover: weatherQuery.weather.current.cloudCover,
              windSpeed: weatherQuery.weather.current.windSpeed,
            }
          : undefined,
      });
      setPrediction(result);
    } catch {
      setPrediction(null);
    } finally {
      setIsPredicting(false);
    }
  }, [fanSpeed, mode, selectedDevice, weatherQuery.weather]);

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
    } else if (weatherQuery.weather) {
      setWeatherConfirmOpen(true);
    } else {
      await handleStart(selectedDevice.deviceId, mode, temperature, fanSpeed);
    }
  };

  const suggestedSettings = useMemo(() => {
    const humidity = weatherQuery.weather?.current.humidity ?? 0;
    if (humidity > 75) {
      return { temperature: 52, fanSpeed: 85 };
    }
    if (humidity > 60) {
      return { temperature: 48, fanSpeed: 75 };
    }
    return { temperature: 45, fanSpeed: 70 };
  }, [weatherQuery.weather?.current.humidity]);

  const continueWeatherStart = async (applySuggestions: boolean) => {
    if (!selectedDevice) {
      return;
    }

    setWeatherConfirmOpen(false);
    const nextTemperature = applySuggestions ? suggestedSettings.temperature : temperature;
    const nextFanSpeed = applySuggestions ? suggestedSettings.fanSpeed : fanSpeed;
    if (applySuggestions) {
      setTemperature(nextTemperature);
      setFanSpeed(nextFanSpeed);
    }
    await handleStart(selectedDevice.deviceId, mode, nextTemperature, nextFanSpeed);
  };

  const controlDisabled = !selectedDevice || !canInteract || fanControls.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Dryer Control</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select a dryer and send hardware-safe commands.</Text>
        </View>
        {devicesLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Device</Text>
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
        <Card
          style={[
            styles.selectedCard,
            { backgroundColor: controlCardBg, borderColor: controlCardBorder },
            !selectedDeviceOnline && { backgroundColor: mutedPanelBg, borderColor: controlCardBorder, opacity: 0.96 },
          ]}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{selectedDevice.name}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{selectedDevice.deviceId}</Text>
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

      <Card
        style={[
          styles.panel,
          { backgroundColor: controlCardBg, borderColor: controlCardBorder },
          !canInteract && { backgroundColor: mutedPanelBg, opacity: 0.96 },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mode</Text>
        <SegmentedMode disabled={!canInteract} mode={mode} onBlocked={warnOffline} onChange={setMode} />
        {mode === "AUTO" ? (
          <Card style={[styles.aiCard, { backgroundColor: isDark ? "#132417" : "#F0FDF4", borderColor: isDark ? "#24452B" : theme.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI Prediction</Text>
              {isPredicting ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="sparkles" size={21} color={COLORS.primary} />}
            </View>
            {prediction ? (
              <>
                <Text style={[styles.aiMetric, { color: theme.textPrimary }]}>30 min moisture: {prediction.predictedMoisture30min.toFixed(1)}%</Text>
                <Text style={[styles.aiMetric, { color: theme.textPrimary }]}>Time to target: {prediction.estimatedMinutesToTarget} min</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{prediction.recommendation}</Text>
              </>
            ) : (
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Prediction appears when recent sensor data is available.</Text>
            )}
            <Text style={[styles.autoStopText, { color: theme.accentPrimary }]}>AI will auto-stop when moisture reaches 14%.</Text>
            <Pressable onPress={() => router.push("/(app)/ai-prediction")} style={styles.aiShortcut}>
              <Ionicons name="analytics" size={18} color={COLORS.primary} />
              <Text style={styles.aiShortcutText}>Open AI Prediction</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <View style={styles.sliderBlock}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Temperature</Text>
                <Text style={[styles.sliderValue, { color: theme.accentPrimary }]}>{temperature}°C</Text>
              </View>
              <View style={styles.sliderShell}>
                <Slider
                  disabled={isRunning || !canInteract}
                  maximumTrackTintColor="rgba(118,118,128,0.18)"
                  maximumValue={75}
                  minimumTrackTintColor={COLORS.primary}
                  minimumValue={35}
                  onValueChange={setTemperature}
                  step={1}
                  style={styles.iosSlider}
                  thumbTintColor="#FFFFFF"
                  value={temperature}
                />
              </View>
            </View>

            <View style={styles.sliderBlock}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Fan Speed</Text>
                <Text style={[styles.sliderValue, { color: theme.accentPrimary }]}>{fanSpeed}%</Text>
              </View>
              <View style={styles.sliderShell}>
                <Slider
                  disabled={isRunning || !canInteract}
                  maximumTrackTintColor="rgba(118,118,128,0.18)"
                  maximumValue={100}
                  minimumTrackTintColor={COLORS.primary}
                  minimumValue={0}
                  onValueChange={setFanSpeed}
                  step={5}
                  style={styles.iosSlider}
                  thumbTintColor="#FFFFFF"
                  value={fanSpeed}
                />
              </View>
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
          (!selectedDevice || !canInteract || isControlling) && styles.primaryButtonDisabled,
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
          <Card style={[styles.panel, { backgroundColor: controlCardBg, borderColor: controlCardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Fan Control</Text>
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

          <Card style={[styles.panel, { backgroundColor: controlCardBg, borderColor: controlCardBorder }]}>
            <Pressable style={styles.advancedHeader} onPress={() => setAdvancedOpen((open) => !open)}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Advanced Controls</Text>
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

      <Modal animationType="fade" transparent visible={weatherConfirmOpen} onRequestClose={() => setWeatherConfirmOpen(false)}>
        <View style={styles.weatherModalBackdrop}>
          <View style={[styles.weatherModal, { backgroundColor: theme.bgCard }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Current Weather</Text>
              <Pressable onPress={() => setWeatherConfirmOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </Pressable>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Outdoor Humidity: {weatherQuery.weather?.current.humidity.toFixed(0)}%
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Temperature: {weatherQuery.weather?.current.temperature.toFixed(0)} C
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary, textTransform: "capitalize" }]}>
              Conditions: {weatherQuery.weather?.current.description}
            </Text>
            <View style={styles.weatherAdviceBox}>
              <Ionicons
                name={weatherQuery.weather?.dryingAdvice.suitable ? "leaf-outline" : "warning-outline"}
                size={20}
                color={weatherQuery.weather?.dryingAdvice.suitable ? COLORS.success : COLORS.warning}
              />
              <View style={styles.weatherAdviceText}>
                <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>Drying Advisory</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {weatherQuery.weather?.dryingAdvice.recommendation}
                </Text>
              </View>
            </View>
            <View style={styles.suggestionBox}>
              <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>Suggested Settings</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Temperature: {suggestedSettings.temperature} C</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Fan Speed: {suggestedSettings.fanSpeed}%</Text>
            </View>
            <View style={styles.weatherModalActions}>
              <Pressable onPress={() => void continueWeatherStart(true)} style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply Suggestions</Text>
              </Pressable>
              <Pressable onPress={() => void continueWeatherStart(false)} style={[styles.continueButton, { borderColor: theme.border }]}>
                <Text style={[styles.continueButtonText, { color: theme.textPrimary }]}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  applyButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flex: 1,
    paddingVertical: 13,
  },
  applyButtonText: {
    color: "#FFFFFF",
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
    paddingTop: 0,
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
  continueButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  continueButtonText: {
    fontSize: 13,
    fontWeight: "900",
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
  disabledPanel: {
    backgroundColor: "#F3F4F6",
    opacity: 0.86,
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
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  panel: {
    gap: SPACING.md,
  },
  offlineCard: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    opacity: 0.9,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.72,
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
    backgroundColor: "rgba(118,118,128,0.13)",
    borderRadius: 16,
    flexDirection: "row",
    padding: 3,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  segmentButtonSelectedDark: {
    backgroundColor: "#2C2C2E",
    shadowOpacity: 0.32,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  selectedCard: {
    gap: SPACING.sm,
  },
  sliderBlock: {
    gap: 10,
  },
  sliderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: {
    color: "#636366",
    fontSize: 13,
    fontWeight: "700",
  },
  iosSlider: {
    height: 34,
    marginHorizontal: -4,
  },
  sliderShell: {
    backgroundColor: "rgba(118,118,128,0.12)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    overflow: "hidden",
  },
  sliderValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
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
  suggestionBox: {
    gap: 4,
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
  weatherAdviceBox: {
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  weatherAdviceText: {
    flex: 1,
    gap: 3,
  },
  weatherModal: {
    borderRadius: 22,
    gap: SPACING.md,
    margin: SPACING.lg,
    padding: SPACING.lg,
    width: "92%",
  },
  weatherModalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  weatherModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    flex: 1,
    justifyContent: "center",
  },
});
