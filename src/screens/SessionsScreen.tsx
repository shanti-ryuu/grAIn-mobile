import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DeviceSummary, SessionSummary, grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { useDevices } from "@/hooks/useDevices";
import { useDryingSessions } from "@/hooks/useDryingSessions";
import { useOfflineGuard } from "@/hooks/useOfflineGuard";
import { useWeather } from "@/hooks/useWeather";
import { COLORS, SPACING } from "@/utils/constants";
import { clampPercent, relativeTime, sessionProgress } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";
import { generateSessionReport, shareReport } from "@/utils/pdf-generator";

const grainTypes = ["rice", "corn", "wheat", "soybean", "coffee"] as const;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMoisture(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "--";
}

function formatDuration(seconds?: number, startedAt?: string, now = Date.now()): string {
  const totalSeconds = seconds ?? (startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function efficiencyColor(value?: number): string {
  if (typeof value !== "number") {
    return COLORS.textSecondary;
  }
  if (value >= 80) {
    return COLORS.success;
  }
  if (value >= 50) {
    return COLORS.warning;
  }
  return COLORS.danger;
}

function ProgressBar({ progress }: { progress: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.bgElevated }]}>
      <View style={[styles.progressFill, { backgroundColor: theme.statusOnline, width: `${clampPercent(progress)}%` }]} />
    </View>
  );
}

function SessionItem({
  session,
  exporting,
  onExport,
}: {
  session: SessionSummary;
  exporting: boolean;
  onExport: () => void;
}) {
  const { isDark, theme } = useTheme();
  const finalOrCurrent = session.finalMoisture ?? session.currentMoisture;
  return (
    <Card style={[styles.sessionItem, isDark && styles.darkCard]}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={[styles.sessionDevice, { color: theme.textPrimary }]}>{session.deviceId}</Text>
          <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>{titleCase(session.grainType)}</Text>
        </View>
        <View style={styles.sessionActions}>
          {exporting ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Pressable onPress={onExport} style={[styles.exportIcon, { borderColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={16} color={theme.accentPrimary} />
            </Pressable>
          )}
          <StatusBadge status={session.status} size="sm" />
        </View>
      </View>
      <View style={styles.sessionLine}>
        <Text style={[styles.sessionText, { color: theme.textPrimary }]}>
          {formatMoisture(session.startMoisture)} to {formatMoisture(finalOrCurrent)}
        </Text>
        <Text style={[styles.efficiencyText, { color: efficiencyColor(session.efficiency) }]}>
          {typeof session.efficiency === "number" ? `${session.efficiency.toFixed(0)}%` : "--"}
        </Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>Duration: {formatDuration(session.duration, session.startedAt)}</Text>
        <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>{relativeTime(session.startedAt ?? session.createdAt)}</Text>
      </View>
    </Card>
  );
}

function DeviceChip({
  device,
  selected,
  onPress,
}: {
  device: DeviceSummary;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modalChip,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        selected && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
        device.status !== "online" && styles.offlineChip,
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: device.status === "online" ? COLORS.success : COLORS.idle }]} />
      <Text style={[styles.modalChipText, { color: theme.textPrimary }, selected && styles.modalChipTextActive]}>{device.deviceId}</Text>
    </Pressable>
  );
}

export function SessionsScreen() {
  const { devices } = useDevices();
  const { sessions, activeSession, isLoading, error, startSession, endSession, refetch } = useDryingSessions();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSummary | null>(null);
  const [grainType, setGrainType] = useState<(typeof grainTypes)[number]>("rice");
  const [targetMoisture, setTargetMoisture] = useState(14);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportingSessionId, setExportingSessionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const { isDark, theme } = useTheme();
  const bottomPadding = useBottomTabPadding(40);
  const darkModalSurface = isDark ? "#1C1C1E" : theme.bgCard;
  const darkBorder = isDark ? "#2C2C2E" : theme.border;
  const weatherQuery = useWeather(true);

  const onlineDevices = useMemo(() => devices.filter((device) => device.status === "online"), [devices]);
  const historySessions = useMemo(() => sessions.filter((session) => session.status !== "active"), [sessions]);
  const activeDeviceOnline = useMemo(() => {
    if (!activeSession) {
      return true;
    }
    return devices.find((device) => device.deviceId === activeSession.deviceId)?.status === "online";
  }, [activeSession, devices]);
  const { canInteract, warnOffline } = useOfflineGuard(activeDeviceOnline);
  const activeProgress = activeSession
    ? sessionProgress(activeSession.startMoisture, activeSession.currentMoisture, activeSession.targetMoisture)
    : 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedDevice && onlineDevices.length > 0) {
      setSelectedDevice(onlineDevices[0]);
    }
  }, [onlineDevices, selectedDevice]);

  const openStartModal = () => {
    if (onlineDevices.length === 0) {
      warnOffline("No online dryer is available for a new session.");
      return;
    }
    setSelectedDevice(onlineDevices[0] ?? null);
    setModalOpen(true);
  };

  const submitStart = async () => {
    if (!selectedDevice || selectedDevice.status !== "online" || !canInteract) {
      warnOffline();
      return;
    }

    setIsSubmitting(true);
    try {
      await startSession(selectedDevice.deviceId, grainType, targetMoisture);
      setModalOpen(false);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeActive = async () => {
    if (!canInteract) {
      warnOffline();
      return;
    }
    if (activeSession) {
      await endSession(activeSession._id, "complete");
    }
  };

  const abortActive = async () => {
    if (!canInteract) {
      warnOffline();
      return;
    }
    if (activeSession) {
      await endSession(activeSession._id, "abort");
    }
  };

  const exportSession = async (session: SessionSummary) => {
    setExportingSessionId(session._id);
    try {
      const reportData = await grainApi.sessions.getReport(session._id);
      const report = await generateSessionReport(reportData);
      await shareReport(report.uri, report.filename);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExportingSessionId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Drying Sessions</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Track moisture progress from start to finish.</Text>
        </View>
        <Pressable onPress={openStartModal} style={styles.startSessionButton}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.startSessionText}>Start</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        data={historySessions}
        keyExtractor={(item: SessionSummary) => item._id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {activeSession ? (
              <Card style={[styles.activeCard, isDark && styles.darkCard]}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[styles.activeTitle, { color: theme.textPrimary }]}>{activeSession.deviceId}</Text>
                    <Text style={[styles.activeSubtitle, { color: theme.textSecondary }]}>{titleCase(activeSession.grainType)}</Text>
                  </View>
                  <StatusBadge status="active" size="sm" />
                </View>
                <ProgressBar progress={activeProgress} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.activeMetric, { color: theme.textPrimary }]}>
                    {formatMoisture(activeSession.currentMoisture)} to {formatMoisture(activeSession.targetMoisture)}
                  </Text>
                  <Text style={[styles.activeMetric, { color: theme.textPrimary }]}>{activeProgress.toFixed(0)}%</Text>
                </View>
                <View style={styles.rowBetween}>
                    <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                    Elapsed: {formatDuration(activeSession.duration, activeSession.startedAt, now)}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                    Energy: {(activeSession.totalEnergyUsed ?? 0).toFixed(2)} kWh
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => void exportSession(activeSession)} style={[styles.outlineButton, styles.exportOutline]}>
                    <Text style={[styles.outlineText, { color: COLORS.primary }]}>Export PDF</Text>
                  </Pressable>
                  <Pressable onPress={completeActive} style={[styles.outlineButton, styles.completeOutline, !canInteract && styles.disabledButton]}>
                    <Text style={[styles.outlineText, { color: COLORS.success }]}>Complete</Text>
                  </Pressable>
                  <Pressable onPress={abortActive} style={[styles.outlineButton, styles.abortOutline, !canInteract && styles.disabledButton]}>
                    <Text style={[styles.outlineText, { color: COLORS.danger }]}>Abort</Text>
                  </Pressable>
                </View>
              </Card>
            ) : (
              <Card style={[styles.activeCard, isDark && styles.darkCard]}>
                <Text style={[styles.activeTitle, { color: theme.textPrimary }]}>No active session</Text>
                <Text style={[styles.activeSubtitle, { color: theme.textSecondary }]}>Start a session when an online dryer is ready.</Text>
              </Card>
            )}

            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>History</Text>
              {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              mood="happy"
              title="No drying sessions yet"
              subtitle="Start a session to begin tracking moisture, energy, and efficiency."
              actionLabel="Start Session"
              onAction={openStartModal}
            />
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isLoading}
        renderItem={({ item }: { item: SessionSummary }) => (
          <SessionItem
            session={item}
            exporting={exportingSessionId === item._id}
            onExport={() => void exportSession(item)}
          />
        )}
      />

      <Modal animationType="slide" transparent visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: darkModalSurface, borderColor: darkBorder }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Start Session</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>Device</Text>
            <FlatList
              data={devices}
              horizontal
              keyExtractor={(item: DeviceSummary) => item._id}
              renderItem={({ item }: { item: DeviceSummary }) => (
                <DeviceChip
                  device={item}
                  onPress={() => setSelectedDevice(item)}
                  selected={selectedDevice?.deviceId === item.deviceId}
                />
              )}
              showsHorizontalScrollIndicator={false}
            />

            <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>Grain Type</Text>
            <View style={styles.chipWrap}>
              {grainTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setGrainType(type)}
                  style={[
                    styles.modalChip,
                    { backgroundColor: darkModalSurface, borderColor: darkBorder },
                    grainType === type && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                  ]}
                >
                  <Text style={[styles.modalChipText, { color: theme.textPrimary }, grainType === type && styles.modalChipTextActive]}>
                    {titleCase(type)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>Target Moisture</Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => setTargetMoisture((value) => Math.max(10, value - 1))}
                style={[styles.stepperControl, { backgroundColor: isDark ? "#132417" : "#F0FDF4" }]}
              >
                <Ionicons name="remove" size={22} color={COLORS.primary} />
              </Pressable>
              <Text style={[styles.stepperValue, { color: theme.textPrimary }]}>{targetMoisture}%</Text>
              <Pressable
                onPress={() => setTargetMoisture((value) => Math.min(20, value + 1))}
                style={[styles.stepperControl, { backgroundColor: isDark ? "#132417" : "#F0FDF4" }]}
              >
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </Pressable>
            </View>

            {weatherQuery.weather ? (
              <View style={[styles.weatherCard, { backgroundColor: isDark ? "#132417" : "#F8FAF6", borderColor: isDark ? "#24452B" : "#DDE8D9" }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>Weather Advisory</Text>
                  <Ionicons
                    name={weatherQuery.weather.dryingAdvice.suitable ? "leaf-outline" : "warning-outline"}
                    size={19}
                    color={weatherQuery.weather.dryingAdvice.suitable ? COLORS.success : COLORS.warning}
                  />
                </View>
                <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                  Outdoor humidity: {weatherQuery.weather.current.humidity.toFixed(0)}% · {weatherQuery.weather.current.temperature.toFixed(0)} C
                </Text>
                <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                  {weatherQuery.weather.dryingAdvice.recommendation}
                </Text>
              </View>
            ) : null}

            <Pressable
              disabled={isSubmitting}
              onPress={submitStart}
              style={[
                styles.modalStartButton,
                (!selectedDevice || selectedDevice.status !== "online" || !canInteract || isSubmitting) && styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalStartText}>Start Drying</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  abortOutline: {
    borderColor: COLORS.danger,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  activeCard: {
    gap: SPACING.md,
  },
  activeMetric: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  activeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activeTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  completeOutline: {
    borderColor: COLORS.success,
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
  darkCard: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  disabledButton: {
    opacity: 0.45,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  exportIcon: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  exportOutline: {
    borderColor: COLORS.primary,
  },
  efficiencyText: {
    fontSize: 14,
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerContent: {
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  listHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalChip: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    marginRight: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  modalChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalChipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  modalChipTextActive: {
    color: "#FFFFFF",
  },
  modalLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopWidth: 0.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: SPACING.md,
    maxHeight: "86%",
    padding: SPACING.lg,
  },
  modalStartButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
  },
  modalStartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
  offlineChip: {
    opacity: 0.58,
  },
  outlineButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  outlineText: {
    fontSize: 14,
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
    height: 12,
    overflow: "hidden",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  sessionDevice: {
    color: COLORS.textPrimary,
    fontFamily: "monospace",
    fontSize: 15,
    fontWeight: "900",
  },
  sessionItem: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sessionLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  sessionMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  sessionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  startSessionButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
  },
  startSessionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  stepperControl: {
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.lg,
  },
  stepperValue: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "900",
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
  weatherCard: {
    backgroundColor: "#F8FAF6",
    borderColor: "#DDE8D9",
    borderRadius: 16,
    borderWidth: 1,
    gap: SPACING.xs,
    padding: SPACING.md,
  },
});
