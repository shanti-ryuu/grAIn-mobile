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

import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { GrainApiError } from "@/api/grain-api-client";
import { COLORS, SPACING } from "@/utils/constants";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/(app)/dashboard");
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (submitError instanceof GrainApiError && submitError.errorCode === "EMAIL_NOT_VERIFIED") {
        const data = submitError.data as { email?: string } | undefined;
        router.push({ pathname: "/verify-otp", params: { email: data?.email ?? email.trim() } } as never);
        return;
      }
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.logoWrap}>
        <BrandLogo style={styles.logoImage} />
        <Text style={styles.subtitle}>Smart rice grain dryer monitoring</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="admin@grain.com"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordField}>
          <TextInput
            onChangeText={setPassword}
            placeholder="Enter password"
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
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Log In</Text>}
        </Pressable>

        <Link href="/(auth)/signup" style={styles.link}>
          Create a new account
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
    height: 94,
    width: 220,
  },
  logoWrap: {
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
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
    fontSize: 14,
  },
});
