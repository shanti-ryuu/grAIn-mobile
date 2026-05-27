import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useServerStatus } from "@/context/ServerStatusContext";
import { useTheme } from "@/context/ThemeContext";
import { SPACING } from "@/utils/constants";

export function ServerStatusBanner() {
  const { isServerOnline, queuedCommandCount } = useServerStatus();
  const { theme, isDark } = useTheme();

  if (isServerOnline) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? "#2F250B" : "#FEF3C7",
          borderColor: isDark ? "#6B5415" : "#FDE68A",
        },
      ]}
    >
      <Ionicons name="cloud-offline" size={18} color={theme.statusWarning} />
      <Text style={[styles.text, { color: isDark ? "#FDE68A" : "#92400E" }]}>
        Server unreachable - {queuedCommandCount} commands queued
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  text: {
    color: "#92400E",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
});
