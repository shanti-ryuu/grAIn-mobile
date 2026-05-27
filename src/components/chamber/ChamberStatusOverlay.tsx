import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";

interface ChamberStatusOverlayProps {
  temperature: number;
  moisture: number;
  fanSpeed: number;
  isRunning: boolean;
}

function tempColor(temperature: number): string {
  if (temperature > 55) {
    return COLORS.danger;
  }
  if (temperature >= 45) {
    return COLORS.warning;
  }
  return COLORS.success;
}

function moistureLevelColor(moisture: number): string {
  if (moisture > 20) {
    return COLORS.danger;
  }
  if (moisture >= 14) {
    return COLORS.warning;
  }
  return COLORS.success;
}

function Chip({ label, color, position }: { label: string; color: string; position: "tl" | "tr" | "bl" | "br" }) {
  const { isDark, theme } = useTheme();
  const content = (
    <View style={[styles.chipInner, { borderColor: color, backgroundColor: isDark ? "rgba(15,20,16,0.72)" : "rgba(255,255,255,0.72)" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color: theme.textPrimary }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.chip, styles[position]]}>
      {Platform.OS === "ios" || Platform.OS === "android" ? (
        <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        content
      )}
    </View>
  );
}

export function ChamberStatusOverlay({ temperature, moisture, fanSpeed, isRunning }: ChamberStatusOverlayProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Chip color={isRunning ? COLORS.success : COLORS.idle} label={isRunning ? "RUNNING" : "IDLE"} position="tl" />
      <Chip color={tempColor(temperature)} label={`${temperature.toFixed(1)} C`} position="tr" />
      <Chip color={moistureLevelColor(moisture)} label={`${moisture.toFixed(1)}% MC`} position="bl" />
      <Chip color={COLORS.info} label={`${fanSpeed.toFixed(0)}% FAN`} position="br" />
    </View>
  );
}

const styles = StyleSheet.create({
  bl: {
    bottom: SPACING.sm,
    left: SPACING.sm,
  },
  blur: {
    borderRadius: 999,
    overflow: "hidden",
  },
  br: {
    bottom: SPACING.sm,
    right: SPACING.sm,
  },
  chip: {
    position: "absolute",
  },
  chipInner: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: undefined }),
    fontSize: 11,
    fontWeight: "800",
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  tl: {
    left: SPACING.sm,
    top: SPACING.sm,
  },
  tr: {
    right: SPACING.sm,
    top: SPACING.sm,
  },
});
