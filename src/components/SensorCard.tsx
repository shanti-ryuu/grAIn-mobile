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
  secondaryLabel?: string;
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

function displayUnit(unit: string): string {
  if (unit.toLowerCase() === "c") {
    return "°C";
  }
  return unit;
}

export function SensorCard({ icon, label, value, unit, color, secondaryLabel }: SensorCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.1, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [scale, value]);

  const valueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradient = gradientForLabel(label, isDark);
  const iconColor = color ?? "#FFFFFF";
  const formattedUnit = displayUnit(unit);

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <LinearGradient colors={gradient} style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </LinearGradient>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        <View style={styles.valueRow}>
          <Animated.Text style={[styles.value, { color: theme.textPrimary }, valueStyle]} numberOfLines={1}>
            {value}
          </Animated.Text>
          {formattedUnit ? <Text style={[styles.unit, { color: theme.textTertiary }]}>{formattedUnit}</Text> : null}
        </View>
        {secondaryLabel ? <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]} numberOfLines={1}>{secondaryLabel}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: SPACING.sm,
    justifyContent: "space-between",
    minHeight: 186,
  },
  content: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  secondaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
  },
  valueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minWidth: "100%",
  },
  value: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  unit: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
});
