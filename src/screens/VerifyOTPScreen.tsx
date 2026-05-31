import * as Haptics from "expo-haptics";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
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
import { useTutorial } from "@/context/TutorialContext";
import { COLORS, SPACING } from "@/utils/constants";

export function VerifyOTPScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => (typeof params.email === "string" ? params.email : ""), [params.email]);
  const { verifyOtp, resendOtp } = useAuth();
  const { resetFeatureTutorials } = useTutorial();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(
    initialEmail ? "Verification code sent to your email." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const submit = async () => {
    setIsVerifying(true);
    setError(null);
    setMessage(null);
    try {
      await verifyOtp(email.trim(), otp.trim());
      await resetFeatureTutorials();
      router.replace("/(app)/dashboard");
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(submitError instanceof Error ? submitError.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      const nextMessage = await resendOtp(email.trim());
      setMessage(nextMessage);
    } catch (resendError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(resendError instanceof Error ? resendError.message : "Could not resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <BrandLogo style={styles.logoImage} />
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent by grAIn.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="farmer@grain.com"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Verification Code</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => setOtp(value.replace(/\D/g, ""))}
          placeholder="000000"
          placeholderTextColor="#9CA3AF"
          style={[styles.input, styles.otpInput]}
          value={otp}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={isVerifying || otp.length !== 6 || !email.trim()}
          onPress={submit}
          style={[styles.button, (isVerifying || otp.length !== 6 || !email.trim()) && styles.disabled]}
        >
          {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify Account</Text>}
        </Pressable>

        <Pressable disabled={isResending || !email.trim()} onPress={resend} style={styles.secondaryButton}>
          {isResending ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Resend code</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          Back to login
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
    alignSelf: "center",
    height: 82,
    marginBottom: SPACING.sm,
    width: 200,
  },
  message: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
  },
  secondaryButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
});
