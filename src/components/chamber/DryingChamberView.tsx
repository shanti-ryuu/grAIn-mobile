import { LinearGradient } from "expo-linear-gradient";
import { Component, ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChamberIllustration2D } from "@/components/chamber/ChamberIllustration2D";
import { ChamberStatusOverlay } from "@/components/chamber/ChamberStatusOverlay";
import type { ChamberTelemetry } from "@/components/chamber/chamberTypes";
import { clamp } from "@/components/chamber/chamberTypes";
import { DryingChamber3D } from "@/components/chamber/DryingChamber3D";
import { useTheme } from "@/context/ThemeContext";
import { SPACING } from "@/utils/constants";

interface ChamberBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ChamberBoundaryState {
  hasError: boolean;
}

class ChamberBoundary extends Component<ChamberBoundaryProps, ChamberBoundaryState> {
  state: ChamberBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChamberBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function roundTelemetry(props: ChamberTelemetry): ChamberTelemetry {
  return {
    ...props,
    temperature: Math.round(props.temperature * 2) / 2,
    humidity: Math.round(props.humidity),
    moisture: Math.round(props.moisture * 10) / 10,
    fanSpeed: Math.round(props.fanSpeed / 5) * 5,
    weight: Math.round(props.weight * 10) / 10,
  };
}

export function DryingChamberView(props: ChamberTelemetry) {
  const { isDark, theme } = useTheme();
  const telemetry = useMemo(() => {
    const rounded = roundTelemetry(props);
    return {
      ...rounded,
      humidity: clamp(rounded.humidity, 0, 100),
      moisture: clamp(rounded.moisture, 0, 100),
      fanSpeed: clamp(rounded.fanSpeed, 0, 100),
      temperature: clamp(rounded.temperature, 0, 75),
      weight: Math.max(0, rounded.weight),
    };
  }, [
    props.fan1State,
    props.fan2State,
    props.fanSpeed,
    props.heaterState,
    props.humidity,
    props.isRunning,
    props.moisture,
    props.temperature,
    props.weight,
  ]);

  const gradient = isDark ? (["#0A1A0C", "#0F2010"] as const) : (["#E8F5E9", "#F1F8E9"] as const);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Drying Chamber</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Touch and drag to rotate the live view.</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.accentPrimarySubtle, borderColor: theme.border }]}>
          <Text style={[styles.badgeText, { color: theme.accentPrimary }]}>Live 3D View</Text>
        </View>
      </View>

      <LinearGradient colors={gradient} style={[styles.chamberFrame, { borderColor: theme.border }]}>
        <ChamberBoundary fallback={<ChamberIllustration2D {...telemetry} />}>
          <DryingChamber3D {...telemetry} />
        </ChamberBoundary>
        <ChamberStatusOverlay
          fanSpeed={telemetry.fanSpeed}
          isRunning={telemetry.isRunning}
          moisture={telemetry.moisture}
          temperature={telemetry.temperature}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  chamberFrame: {
    borderRadius: 16,
    borderWidth: 1,
    height: 280,
    overflow: "hidden",
  },
  section: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
});
