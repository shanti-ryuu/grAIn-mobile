import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { useToast } from "@/context/ToastContext";
import { COLORS, SPACING } from "@/utils/constants";

function isValidDeviceId(value: string): boolean {
  return /^[A-Za-z0-9-]{3,20}$/.test(value);
}

export function AddDeviceScreen() {
  const { showToast } = useToast();
  const [deviceId, setDeviceId] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const normalizedId = deviceId.trim().toUpperCase();
    if (!isValidDeviceId(normalizedId)) {
      showToast("Use a valid device ID such as GR-001", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await grainApi.devices.register(normalizedId, location.trim() || undefined);
      showToast("Device registered!", "success");
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to register device", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.title}>Add Device</Text>
          <Text style={styles.subtitle}>Register a dryer unit to your account.</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.label}>Device ID</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setDeviceId}
          placeholder="GR-001"
          style={styles.input}
          value={deviceId}
        />
        <Text style={styles.label}>Location</Text>
        <TextInput onChangeText={setLocation} placeholder="Farm A" style={styles.input} value={location} />
        <Pressable disabled={isSubmitting} onPress={submit} style={styles.button}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Register Device</Text>}
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  card: {
    gap: SPACING.sm,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
    gap: SPACING.lg,
    padding: SPACING.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.textPrimary,
    minHeight: 50,
    paddingHorizontal: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
});
