import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/components/Card";
import { useTheme } from "@/context/ThemeContext";
import { SPACING } from "@/utils/constants";

type SensorCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit: string;
  color?: string;
};

function gradientForLabel(label: string, isDark: boolean): readonly [string, string] {
  const lower = label.toLowerCase();
  if (lower.includes("temp")) {
    return isDark ? ["#431407", "#9A3412"] : ["#FED7AA", "#F97316"];
  }
  if (lower.includes("humid")) {
    return isDark ? ["#0C1445", "#1D4ED8"] : ["#BAE6FD", "#3B82F6"];
  }
  if (lower.includes("moist")) {
    return isDark ? ["#052E16", "#15803D"] : ["#BBF7D0", "#22C55E"];
  }
  if (lower.includes("fan")) {
    return isDark ? ["#1E1B4B", "#4338CA"] : ["#E0E7FF", "#6366F1"];
  }
  if (lower.includes("solar")) {
    return isDark ? ["#1C1400", "#A16207"] : ["#FEF9C3", "#EAB308"];
  }
  return isDark ? ["#2D0A1E", "#9D174D"] : ["#FCE7F3", "#EC4899"];
}

function numericValue(value: string | number): number {
  return typeof value === "number" ? value : Number(value.replace(/[^\d.-]/g, ""));
}

export function SensorCard({ icon, label, value, unit, color }: SensorCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const parsed = numericValue(value);
  const progress = Number.isFinite(parsed)
    ? Math.max(0, Math.min(100, label.toLowerCase().includes("temp") ? (parsed / 75) * 100 : parsed))
    : 0;

  useEffect(() => {
    scale.value = withSequence(withTiming(1.1, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [scale, value]);

  const valueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradient = gradientForLabel(label, isDark);
  const iconColor = color ?? "#FFFFFF";

  return (
    <Card style={styles.card}>
      <LinearGradient colors={gradient} style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </LinearGradient>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Animated.Text style={[styles.value, { color: theme.textPrimary }, valueStyle]}>{value}</Animated.Text>
        <Text style={[styles.unit, { color: theme.textTertiary }]}>{unit}</Text>
      </View>
      <View style={[styles.thresholdTrack, { backgroundColor: theme.bgElevated }]}>
        <View
          style={[
            styles.thresholdFill,
            {
              width: `${progress}%`,
              backgroundColor: progress > 75 ? theme.statusDanger : progress > 55 ? theme.statusWarning : theme.statusOnline,
            },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  valueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
  },
  thresholdFill: {
    borderRadius: 999,
    height: "100%",
  },
  thresholdTrack: {
    borderRadius: 999,
    height: 4,
    overflow: "hidden",
  },
  unit: {
    fontSize: 13,
    marginBottom: 3,
  },
});
