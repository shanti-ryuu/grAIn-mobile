import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { grainApi } from "@/api/grain-api-client";
import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";

type ClaimState = "scanning" | "processing" | "success" | "error";

function parseClaimQr(data: string): { deviceId: string; token: string } | null {
  try {
    const url = new URL(data);
    const deviceId = url.searchParams.get("deviceId")?.trim().toUpperCase();
    const token = url.searchParams.get("token")?.trim();
    if (!deviceId || !token) {
      return null;
    }
    return { deviceId, token };
  } catch {
    return null;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("expired")) return "QR code expired";
    if (message.includes("already claimed")) return "Device already claimed";
    if (message.includes("invalid")) return "Invalid QR code";
    return error.message;
  }
  return "Something went wrong";
}

export default function ClaimDeviceScreen() {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ClaimState>("scanning");
  const [statusText, setStatusText] = useState("Point camera at the grAIn QR code");
  const [claimedName, setClaimedName] = useState("");
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 900, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 900, toValue: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const resetScanner = () => {
    setState("scanning");
    setStatusText("Point camera at the grAIn QR code");
    setClaimedName("");
  };

  const handleScan = async (result: BarcodeScanningResult) => {
    if (state !== "scanning") {
      return;
    }

    const parsed = parseClaimQr(result.data);
    if (!parsed) {
      setState("error");
      setStatusText("Invalid QR code");
      return;
    }

    setState("processing");
    setStatusText(`Claiming device ${parsed.deviceId}...`);

    try {
      const response = await grainApi.devices.claimDevice(parsed.deviceId, parsed.token);
      setClaimedName(response.device?.name ?? parsed.deviceId);
      setState("success");
      setStatusText(response.alreadyClaimed ? "Device already assigned to you" : "Device claimed successfully!");
    } catch (error) {
      setState("error");
      setStatusText(errorMessage(error));
    }
  };

  const cornerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.bgBase }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.bgBase }]}>
        <Ionicons name="camera" size={52} color={theme.accentPrimary} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Camera permission needed</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Camera access is required to scan your grAIn device QR code.
        </Text>
        <Pressable onPress={() => void Linking.openSettings()} style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}>
          <Text style={styles.primaryText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Claim a Device</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Scan the QR code provided by your administrator to link a dryer to your account.
        </Text>
      </View>

      <View style={[styles.scannerWrap, { borderColor: theme.border }]}>
        {state === "scanning" ? (
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScan}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[styles.scanPaused, { backgroundColor: theme.bgCard }]}>
            {state === "processing" ? (
              <ActivityIndicator color={theme.accentPrimary} size="large" />
            ) : state === "success" ? (
              <Ionicons name="checkmark-circle" size={74} color={COLORS.success} />
            ) : (
              <Ionicons name="alert-circle" size={74} color={COLORS.danger} />
            )}
          </View>
        )}
        <Animated.View pointerEvents="none" style={[styles.cornerLayer, { opacity: cornerOpacity }]}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </Animated.View>
      </View>

      <View style={[styles.statusCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Text style={[styles.statusText, { color: state === "error" ? COLORS.danger : theme.textPrimary }]}>
          {statusText}
        </Text>
        {state === "processing" ? (
          <Text style={[styles.helperText, { color: theme.textSecondary }]}>QR Code detected! Processing...</Text>
        ) : null}
        {state === "success" ? (
          <>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              {claimedName} is now linked to your account
            </Text>
            <Pressable onPress={() => router.replace("/(app)/dashboard")} style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}>
              <Text style={styles.primaryText}>Go to Dashboard</Text>
            </Pressable>
          </>
        ) : null}
        {state === "error" ? (
          <Pressable onPress={resetScanner} style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}>
            <Text style={styles.primaryText}>Try Again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    gap: SPACING.md,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  corner: {
    borderColor: COLORS.primary,
    height: 42,
    position: "absolute",
    width: 42,
  },
  cornerBottomLeft: {
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    bottom: 22,
    left: 22,
  },
  cornerBottomRight: {
    borderBottomWidth: 5,
    borderRightWidth: 5,
    bottom: 22,
    right: 22,
  },
  cornerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerTopLeft: {
    borderLeftWidth: 5,
    borderTopWidth: 5,
    left: 22,
    top: 22,
  },
  cornerTopRight: {
    borderRightWidth: 5,
    borderTopWidth: 5,
    right: 22,
    top: 22,
  },
  header: {
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  helperText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    marginTop: SPACING.md,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  scanPaused: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerWrap: {
    borderRadius: 24,
    borderWidth: 1,
    height: 300,
    overflow: "hidden",
    width: "100%",
  },
  statusCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
  },
  statusText: {
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
});
