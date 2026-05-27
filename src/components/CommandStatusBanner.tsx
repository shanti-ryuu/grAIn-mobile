import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CommandStatus } from "@/hooks/useDryerControl";
import { COLORS, SPACING } from "@/utils/constants";

type CommandStatusBannerProps = {
  status: CommandStatus;
  commandStr?: string;
  onAutoHide?: () => void;
};

function bannerConfig(status: CommandStatus): {
  message: string;
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
} | null {
  switch (status) {
    case "sent":
      return {
        message: "Command sent, waiting for device...",
        backgroundColor: "#FEF3C7",
        color: "#92400E",
        icon: "time",
      };
    case "confirmed":
      return {
        message: "Command confirmed",
        backgroundColor: "#DCFCE7",
        color: "#166534",
        icon: "checkmark-circle",
      };
    case "timeout":
      return {
        message: "Command timed out - check device connection",
        backgroundColor: "#FEE2E2",
        color: "#991B1B",
        icon: "alert-circle",
      };
    case "failed":
      return {
        message: "Command failed",
        backgroundColor: "#FEE2E2",
        color: "#991B1B",
        icon: "close-circle",
      };
    case "queued":
      return {
        message: "Queued - will send when server is online",
        backgroundColor: "#FFEDD5",
        color: "#9A3412",
        icon: "archive",
      };
    case "idle":
      return null;
  }
}

export function CommandStatusBanner({ status, commandStr, onAutoHide }: CommandStatusBannerProps) {
  const [visible, setVisible] = useState(status !== "idle");
  const config = bannerConfig(status);

  useEffect(() => {
    setVisible(status !== "idle");
    if (status !== "confirmed") {
      return;
    }

    const timeout = setTimeout(() => {
      setVisible(false);
      onAutoHide?.();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [onAutoHide, status]);

  if (!config || !visible) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={20} color={config.color} />
      <View style={styles.content}>
        <Text style={[styles.message, { color: config.color }]}>{config.message}</Text>
        {commandStr ? <Text style={[styles.command, { color: config.color }]}>{commandStr}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  command: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: "800",
  },
});
