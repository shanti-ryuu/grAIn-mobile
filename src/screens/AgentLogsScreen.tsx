import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AgentActionLogSummary, DeviceSummary, grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData, relativeTime } from "@/utils/data";
import { useBottomTabPadding } from "@/utils/layout";

function actionIcon(action: string): keyof typeof Ionicons.glyphMap {
  return action === "send_dryer_command" ? "flash" : "search";
}

function resultColor(result: AgentActionLogSummary["result"]): string {
  if (result === "success") return COLORS.success;
  if (result === "device_offline") return COLORS.warning;
  return COLORS.danger;
}

function LogItem({ item }: { item: AgentActionLogSummary }) {
  const { theme } = useTheme();
  const color = resultColor(item.result ?? "failed");
  return (
    <Card style={styles.logCard}>
      <View style={styles.logTop}>
        <View style={[styles.iconWrap, { backgroundColor: theme.accentPrimarySubtle }]}>
          <Ionicons name={actionIcon(item.action)} size={20} color={item.action === "send_dryer_command" ? COLORS.warning : theme.accentPrimary} />
        </View>
        <View style={styles.logBody}>
          <Text style={[styles.logTitle, { color: theme.textPrimary }]}>
            {item.commandStr ?? item.action.replace(/_/g, " ")}
          </Text>
          <Text style={[styles.logTime, { color: theme.textSecondary }]}>{relativeTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.resultBadge, { borderColor: color }]}>
          <Text style={[styles.resultText, { color }]}>{item.result ?? "failed"}</Text>
        </View>
      </View>
      <Text style={[styles.reason, { color: theme.textSecondary }]}>{item.reason}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.deviceText, { color: theme.textSecondary }]}>{item.deviceId}</Text>
        {item.autonomousMode ? <Text style={styles.autoBadge}>Auto</Text> : null}
      </View>
    </Card>
  );
}

export function AgentLogsScreen() {
  const params = useLocalSearchParams<{ deviceId?: string }>();
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(32);
  const [logs, setLogs] = useState<AgentActionLogSummary[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(typeof params.deviceId === "string" ? params.deviceId : "");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeDeviceId = useMemo(() => selectedDeviceId || devices[0]?.deviceId || "", [devices, selectedDeviceId]);

  const fetchDevices = useCallback(async () => {
    const response = await grainApi.devices.list();
    const nextDevices = getListData<DeviceSummary>(response);
    setDevices(nextDevices);
    if (!selectedDeviceId && nextDevices[0]) {
      setSelectedDeviceId(nextDevices[0].deviceId);
    }
  }, [selectedDeviceId]);

  const fetchLogs = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      setLogs([]);
      return;
    }

    const response = await grainApi.ai.actionLogs(deviceId, { limit: 30 });
    setLogs(getListData<AgentActionLogSummary>(response));
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await fetchDevices();
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [fetchDevices]);

  useEffect(() => {
    if (activeDeviceId) {
      void fetchLogs(activeDeviceId);
    }
  }, [activeDeviceId, fetchLogs]);

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDevices(), fetchLogs(activeDeviceId)]);
    setIsRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>AI Action History</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Review assistant checks and commands.</Text>
        </View>
        {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        data={logs}
        keyExtractor={(item: AgentActionLogSummary) => item._id}
        ListHeaderComponent={
          devices.length > 0 ? (
            <View style={styles.deviceRow}>
              {devices.map((device: DeviceSummary) => {
                const selected = device.deviceId === activeDeviceId;
                return (
                  <Pressable
                    key={device._id}
                    onPress={() => setSelectedDeviceId(device.deviceId)}
                    style={[
                      styles.deviceChip,
                      { backgroundColor: theme.bgCard, borderColor: theme.border },
                      selected && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                    ]}
                  >
                    <Text style={[styles.deviceChipText, { color: selected ? "#FFFFFF" : theme.textSecondary }]}>
                      {device.deviceId}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? <EmptyState title="No AI actions yet" subtitle="Assistant tool use and command actions will appear here." /> : null
        }
        onRefresh={refresh}
        refreshing={isRefreshing}
        renderItem={({ item }: { item: AgentActionLogSummary }) => <LogItem item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  autoBadge: {
    backgroundColor: "#FED7AA",
    borderRadius: 8,
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    padding: SPACING.md,
    paddingTop: 0,
  },
  deviceChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  deviceChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  deviceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  deviceText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "800",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  logBody: {
    flex: 1,
  },
  logCard: {
    gap: SPACING.sm,
  },
  logTime: {
    fontSize: 12,
    fontWeight: "700",
  },
  logTitle: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  logTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  reason: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  resultBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
  },
});
