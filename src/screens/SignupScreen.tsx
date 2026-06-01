import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { useState } from "react";
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

export function SignupScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<"email" | "sms">("sms");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await signup(
        name.trim(),
        email.trim(),
        password,
        phoneNumber.trim(),
        verificationChannel,
      );
      router.push({
        pathname: "/verify-otp",
        params: {
          email: response.email,
          phoneNumber: response.phoneNumber ?? phoneNumber.trim(),
          verificationChannel: response.verificationChannel,
        },
      } as never);
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLogo style={styles.logoImage} />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Connect to the grAIn dryer dashboard.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={name}
          />

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

          <Text style={styles.label}>Send code by</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVerificationChannel("sms")}
              style={[styles.segmentButton, verificationChannel === "sms" && styles.segmentButtonActive]}
            >
              <Ionicons
                color={verificationChannel === "sms" ? "#FFFFFF" : COLORS.textSecondary}
                name="phone-portrait"
                size={18}
              />
              <Text style={[styles.segmentText, verificationChannel === "sms" && styles.segmentTextActive]}>SMS</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVerificationChannel("email")}
              style={[styles.segmentButton, verificationChannel === "email" && styles.segmentButtonActive]}
            >
              <Ionicons
                color={verificationChannel === "email" ? "#FFFFFF" : COLORS.textSecondary}
                name="mail"
                size={18}
              />
              <Text style={[styles.segmentText, verificationChannel === "email" && styles.segmentTextActive]}>
                Email
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              onChangeText={setPassword}
              placeholder="Minimum 8 characters with a number"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!passwordVisible}
              style={[styles.input, styles.passwordInput]}
              value={password}
            />
            <Pressable
              accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Ionicons color={COLORS.textSecondary} name={passwordVisible ? "eye-off" : "eye"} size={22} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={isSubmitting} onPress={submit} style={[styles.button, isSubmitting && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Register</Text>}
          </Pressable>

          <Link href="/(auth)/login" style={styles.link}>
            Already have an account
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
    flexDirection: "row",
    gap: 6,
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
