import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING } from "@/utils/constants";

export function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<"email" | "sms">("sms");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const nextMessage = await forgotPassword(identifier.trim(), verificationChannel);
      setMessage(nextMessage);
      router.push({
        pathname: "/reset-password",
        params: {
          identifier: identifier.trim(),
          verificationChannel,
        },
      } as never);
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(submitError instanceof Error ? submitError.message : "Unable to send reset code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.logoWrap}>
        <BrandLogo style={styles.logoImage} />
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email or mobile number to receive a reset code.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setVerificationChannel("sms")}
            style={[styles.segmentButton, verificationChannel === "sms" && styles.segmentButtonActive]}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={verificationChannel === "sms" ? "#FFFFFF" : COLORS.textSecondary} />
            <Text style={[styles.segmentText, verificationChannel === "sms" && styles.segmentTextActive]}>SMS</Text>
          </Pressable>
          <Pressable
            onPress={() => setVerificationChannel("email")}
            style={[styles.segmentButton, verificationChannel === "email" && styles.segmentButtonActive]}
          >
            <Ionicons name="mail-outline" size={16} color={verificationChannel === "email" ? "#FFFFFF" : COLORS.textSecondary} />
            <Text style={[styles.segmentText, verificationChannel === "email" && styles.segmentTextActive]}>Email</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{verificationChannel === "sms" ? "Mobile Number" : "Email"}</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType={verificationChannel === "sms" ? "phone-pad" : "email-address"}
          onChangeText={setIdentifier}
          placeholder={verificationChannel === "sms" ? "09XXXXXXXXX" : "farmer@grain.com"}
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          value={identifier}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={isSubmitting || !identifier.trim()}
          onPress={submit}
          style={[styles.button, (isSubmitting || !identifier.trim()) && styles.disabled]}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          Back to Login
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  disabled: {
    backgroundColor: "#7A9A73",
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5C0",
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    height: 50,
    paddingHorizontal: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  link: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  logoImage: {
    height: 82,
    width: 200,
  },
  logoWrap: {
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  message: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
    paddingVertical: 11,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentRow: {
    backgroundColor: "#EEF3EA",
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
});
