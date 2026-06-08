import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
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
import { COLORS, SPACING } from "@/utils/constants";

type PasswordStrength = {
  label: string;
  score: number;
  color: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 8,
    /\d/.test(password),
    /[A-Z]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { label: "Use at least 8 characters with a number", score: 0, color: "#CBD5C0" };
  }

  if (score <= 1) {
    return { label: "Weak password", score: 1, color: COLORS.danger };
  }

  if (score <= 3) {
    return { label: "Good password", score, color: "#D97706" };
  }

  return { label: "Strong password", score: 4, color: COLORS.primary };
}

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; identifier?: string; verificationChannel?: "email" | "sms" }>();
  const initialIdentifier = useMemo(
    () => (typeof params.identifier === "string" ? params.identifier : typeof params.email === "string" ? params.email : ""),
    [params.email, params.identifier],
  );
  const initialChannel = params.verificationChannel === "sms" ? "sms" : "email";
  const { resetPassword } = useAuth();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [verificationChannel, setVerificationChannel] = useState<"email" | "sms">(initialChannel);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef<{ focus: () => void } | null>(null);
  const otpDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => otp[index] ?? ""), [otp]);
  const passwordStrength = getPasswordStrength(newPassword);
  const canSubmit =
    identifier.trim().length > 0 &&
    otp.length === 6 &&
    newPassword.length >= 8 &&
    /\d/.test(newPassword) &&
    newPassword === confirmPassword;

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await resetPassword(identifier.trim(), otp.trim(), newPassword, verificationChannel);
      router.replace({
        pathname: "/login",
        params: { message: "Password reset! Please login." },
      } as never);
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(submitError instanceof Error ? submitError.message : "Password reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLogo style={styles.logoImage} />
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {identifier ? `Code sent to ${identifier}` : "Enter your email or mobile number and reset code."}
        </Text>

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

          <Text style={styles.label}>Reset Code</Text>
          <Pressable
            accessibilityLabel="Enter 6 digit reset code"
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

          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              onChangeText={setNewPassword}
              placeholder="Minimum 8 characters with a number"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!newPasswordVisible}
              style={[styles.input, styles.passwordInput]}
              value={newPassword}
            />
            <Pressable
              accessibilityLabel={newPasswordVisible ? "Hide new password" : "Show new password"}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setNewPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Ionicons color={COLORS.textSecondary} name={newPasswordVisible ? "eye-off" : "eye"} size={22} />
            </Pressable>
          </View>
          <View accessibilityLabel={`Password strength: ${passwordStrength.label}`} style={styles.strengthWrap}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.strengthSegment,
                  { backgroundColor: index < passwordStrength.score ? passwordStrength.color : "#E5EDE1" },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!confirmPasswordVisible}
              style={[styles.input, styles.passwordInput]}
              value={confirmPassword}
            />
            <Pressable
              accessibilityLabel={confirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setConfirmPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Ionicons color={COLORS.textSecondary} name={confirmPasswordVisible ? "eye-off" : "eye"} size={22} />
            </Pressable>
          </View>

          {confirmPassword && newPassword !== confirmPassword ? (
            <Text style={styles.error}>Passwords do not match</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting || !canSubmit}
            onPress={submit}
            style={[styles.button, (isSubmitting || !canSubmit) && styles.disabled]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Reset Password</Text>}
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
    flexGrow: 1,
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
  hiddenOtpInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
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
  logoImage: {
    alignSelf: "center",
    height: 82,
    marginBottom: SPACING.sm,
    width: 200,
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
  passwordField: {
    height: 50,
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordToggle: {
    alignItems: "center",
    height: 50,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 52,
  },
  strengthSegment: {
    borderRadius: 999,
    flex: 1,
    height: 5,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "700",
  },
  strengthWrap: {
    flexDirection: "row",
    gap: 5,
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
