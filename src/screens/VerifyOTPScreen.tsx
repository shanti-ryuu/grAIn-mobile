import * as Haptics from "expo-haptics";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const params = useLocalSearchParams<{ email?: string; phoneNumber?: string; verificationChannel?: "email" | "sms" }>();
  const initialEmail = useMemo(() => (typeof params.email === "string" ? params.email : ""), [params.email]);
  const initialPhoneNumber = useMemo(
    () => (typeof params.phoneNumber === "string" ? params.phoneNumber : ""),
    [params.phoneNumber],
  );
  const initialChannel = useMemo(
    () => (params.verificationChannel === "sms" ? "sms" : "email"),
    [params.verificationChannel],
  );
  const { verifyOtp, resendOtp } = useAuth();
  const { resetFeatureTutorials } = useTutorial();
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationChannel, setVerificationChannel] = useState<"email" | "sms">(initialChannel);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(
    initialEmail || initialPhoneNumber
      ? `Verification code sent to your ${initialChannel === "sms" ? "mobile number" : "email"}.`
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const otpInputRef = useRef<{ focus: () => void } | null>(null);
  const otpDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => otp[index] ?? ""), [otp]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async () => {
    setIsVerifying(true);
    setError(null);
    setMessage(null);
    try {
      await verifyOtp({
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        otp: otp.trim(),
        verificationChannel,
      });
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
      const nextMessage = await resendOtp({
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        verificationChannel,
      });
      setMessage(nextMessage);
      setResendSeconds(60);
    } catch (resendError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(resendError instanceof Error ? resendError.message : "Could not resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLogo style={styles.logoImage} />
        <Text style={styles.title}>Verify Account</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent by grAIn.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Code Delivery</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVerificationChannel("sms")}
              style={[styles.segmentButton, verificationChannel === "sms" && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, verificationChannel === "sms" && styles.segmentTextActive]}>SMS</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVerificationChannel("email")}
              style={[styles.segmentButton, verificationChannel === "email" && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, verificationChannel === "email" && styles.segmentTextActive]}>
                Email
              </Text>
            </Pressable>
          </View>

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

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setPhoneNumber}
            placeholder="09XXXXXXXXX"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={phoneNumber}
          />

          <Text style={styles.label}>Verification Code</Text>
          <Pressable
            accessibilityLabel="Enter 6 digit verification code"
            accessibilityRole="button"
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpBoxRow}
          >
            {otpDigits.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  otp.length === index && styles.otpBoxActive,
                  Boolean(digit) && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpBoxText}>{digit}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={otpInputRef}
            caretHidden
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
            style={styles.hiddenOtpInput}
            textContentType="oneTimeCode"
            value={otp}
          />

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isVerifying || otp.length !== 6 || (verificationChannel === "email" ? !email.trim() : !phoneNumber.trim())}
            onPress={submit}
            style={[
              styles.button,
              (isVerifying || otp.length !== 6 || (verificationChannel === "email" ? !email.trim() : !phoneNumber.trim())) &&
                styles.disabled,
            ]}
          >
            {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify Account</Text>}
          </Pressable>

          <Pressable
            disabled={
              isResending ||
              resendSeconds > 0 ||
              (verificationChannel === "email" ? !email.trim() : !phoneNumber.trim())
            }
            onPress={resend}
            style={[
              styles.secondaryButton,
              (isResending || resendSeconds > 0) && styles.secondaryButtonDisabled,
            ]}
          >
            {isResending ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </Text>
            )}
          </Pressable>

          <Link href="/(auth)/login" style={styles.link}>
            Back to login
          </Link>
        </View>
      </ScrollView>
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
  },
  content: {
    justifyContent: "center",
    flexGrow: 1,
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
  segmentedControl: {
    backgroundColor: "#EEF3EA",
    borderColor: "#CBD5C0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#FFFFFF",
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
  hiddenOtpInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
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
  otpBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5C0",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 54,
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  otpBoxFilled: {
    backgroundColor: "#F5FAF2",
  },
  otpBoxRow: {
    flexDirection: "row",
    gap: 8,
  },
  otpBoxText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
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
