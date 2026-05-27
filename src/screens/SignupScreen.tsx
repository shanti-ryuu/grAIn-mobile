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
import { useTutorial } from "@/context/TutorialContext";
import { COLORS, SPACING } from "@/utils/constants";

export function SignupScreen() {
  const { signup } = useAuth();
  const { resetFeatureTutorials } = useTutorial();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "farmer">("farmer");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signup(name.trim(), email.trim(), password, role);
      await resetFeatureTutorials();
      router.replace("/(app)/dashboard");
    } catch (submitError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <BrandLogo style={styles.logoImage} />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Connect to the grAIn dryer dashboard.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput onChangeText={setName} placeholder="Your name" style={styles.input} value={name} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="farmer@grain.com"
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {(["farmer", "admin"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setRole(item)}
              style={[styles.roleButton, role === item && styles.roleButtonActive]}
            >
              <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={submit} style={[styles.button, isSubmitting && styles.disabled]}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Register</Text>}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          Already have an account
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
    opacity: 0.65,
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
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    height: 50,
    paddingHorizontal: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
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
  roleButton: {
    alignItems: "center",
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  roleText: {
    color: COLORS.textSecondary,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  roleTextActive: {
    color: "#FFFFFF",
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
