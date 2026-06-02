import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useLogout } from "@/hooks/useLogout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { COLORS, SPACING } from "@/utils/constants";
import { haptics } from "@/utils/haptics";
import { useBottomTabPadding } from "@/utils/layout";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

const APP_LANG_KEY = "@grain_app_lang";
const CHAT_LANG_KEY = "@grain_chat_lang";
const CRITICAL_ALERTS_KEY = "@grain_critical_alerts";

export function SettingsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme, isDark, toggleTheme } = useTheme();
  const { handleLogout } = useLogout();
  const { registerForPushNotifications } = usePushNotifications();
  const [language, setLanguage] = useState<"EN" | "FIL">("EN");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const bottomPadding = useBottomTabPadding(32);
  const flash = useSharedValue(0);

  useEffect(() => {
    const loadSettings = async () => {
      const [savedLang, pushToken, criticalValue] = await Promise.all([
        AsyncStorage.getItem(APP_LANG_KEY),
        AsyncStorage.getItem("@grain_push_token"),
        AsyncStorage.getItem(CRITICAL_ALERTS_KEY),
      ]);
      if (savedLang === "EN" || savedLang === "FIL") {
        setLanguage(savedLang);
      }
      setPushEnabled(Boolean(pushToken));
      setCriticalAlerts(criticalValue !== "false");
    };

    void loadSettings();
    void grainApi.health
      .check(5000)
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const changeLanguage = async (nextLanguage: "EN" | "FIL") => {
    setLanguage(nextLanguage);
    await AsyncStorage.multiSet([
      [APP_LANG_KEY, nextLanguage],
      [CHAT_LANG_KEY, nextLanguage],
    ]);
  };

  const togglePush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    if (enabled) {
      try {
        await registerForPushNotifications();
        showToast("Push notifications enabled", "success");
      } catch (error) {
        setPushEnabled(false);
        showToast(error instanceof Error ? error.message : "Unable to enable push notifications", "error");
      }
    }
  };

  const toggleCriticalAlerts = async (enabled: boolean) => {
    setCriticalAlerts(enabled);
    await AsyncStorage.setItem(CRITICAL_ALERTS_KEY, String(enabled));
  };

  const flashStyle = useAnimatedStyle(() => ({
    opacity: 1 - flash.value * 0.1,
  }));

  const toggleAppTheme = async () => {
    void haptics.selection();
    flash.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 140 }));
    await toggleTheme();
  };

  return (
    <Animated.View style={[styles.animatedRoot, { backgroundColor: theme.bgBase }, flashStyle]}>
      <View style={[styles.header, { backgroundColor: theme.bgBase }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Account, preferences, and app status.</Text>
      </View>

    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Account</Text>
        <Pressable onPress={() => router.push("/(app)/profile")} style={styles.profileRow}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{user?.name ?? "Profile"}</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{user?.email ?? ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => router.push("/agent-logs" as never)} style={styles.profileRow}>
          <View style={styles.profileIcon}>
            <Ionicons name="time" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>AI Action History</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Review assistant checks and commands</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => void handleLogout()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>App Preferences</Text>
        <ThemeSwitch isDark={isDark} onToggle={toggleAppTheme} />
        <View style={styles.languageRow}>
          {(["EN", "FIL"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => void changeLanguage(item)}
              style={[
                styles.languageButton,
                { backgroundColor: theme.bgElevated, borderColor: theme.border },
                language === item && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
              ]}
            >
              <Text style={[styles.languageText, { color: language === item ? "#FFFFFF" : theme.textSecondary }]}>
                {item === "EN" ? "English" : "Filipino"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Notifications</Text>
        <SettingSwitch label="Push notifications" value={pushEnabled} onValueChange={togglePush} />
        <SettingSwitch label="Critical alerts" value={criticalAlerts} onValueChange={toggleCriticalAlerts} />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>About</Text>
        <InfoLine label="App version" value="grAIn v1.0.0" />
        <InfoLine label="System" value="AI-Assisted IoT Solar-Powered Rice Grain Dryer" />
        <InfoLine label="Capstone" value="St. Dominic College of Asia - BSIT Capstone 2025-2026" />
        <View style={styles.statusRow}>
          <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Backend status</Text>
          {backendOnline === null ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={[styles.statusText, { color: backendOnline ? COLORS.success : COLORS.danger }]}>
              {backendOnline ? "Connected" : "Unreachable"}
            </Text>
          )}
        </View>
      </Card>
    </ScrollView>
    </Animated.View>
  );
}

function ThemeSwitch({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const { theme } = useTheme();
  const options = [
    { key: "light", label: "Light", icon: "sunny" },
    { key: "dark", label: "Dark", icon: "moon" },
  ] as const;

  return (
    <View style={[styles.themeSwitch, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
      {options.map((option) => {
        const selected = option.key === (isDark ? "dark" : "light");
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.key}
            onPress={() => {
              if (!selected) {
                onToggle();
              }
            }}
            style={[styles.themeOption, selected && { backgroundColor: theme.accentPrimary }]}
          >
            <Ionicons name={option.icon} size={18} color={selected ? "#FFFFFF" : theme.textTertiary} />
            <Text style={[styles.themeText, { color: selected ? "#FFFFFF" : theme.textSecondary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingSwitch({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? COLORS.primary : "#F4F4F5"}
        trackColor={{ false: theme.border, true: theme.accentPrimarySubtle }}
        value={value}
      />
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoLine}>
      <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  animatedRoot: {
    flex: 1,
  },
  card: {
    gap: SPACING.md,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: 120,
  },
  header: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  infoLine: {
    gap: 4,
  },
  languageButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingVertical: 12,
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  languageText: {
    color: COLORS.textSecondary,
    fontWeight: "900",
  },
  languageTextActive: {
    color: "#FFFFFF",
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.danger,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "900",
  },
  profileIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  profileText: {
    flex: 1,
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  rowTitle: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "900",
  },
  themeOption: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    height: 44,
    justifyContent: "center",
    minWidth: 0,
  },
  themeSwitch: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    height: 52,
    gap: 4,
    padding: 4,
  },
  themeText: {
    fontSize: 13,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
});
