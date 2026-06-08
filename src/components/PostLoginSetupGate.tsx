import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { grainApi } from "@/api/grain-api-client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { COLORS, SPACING } from "@/utils/constants";

const profileKey = (accountId: string) => `@grain_profile_completed:${accountId}`;
const onboardingKey = (accountId: string) => `@grain_role_onboarding_complete:${accountId}`;

const onboardingScreens = [
  {
    title: "Welcome to grAIn",
    body: "Smart drying, powered by AI. Monitor your dryer, protect grain quality, and keep every session easier to manage.",
    icon: "leaf-outline" as const,
  },
  {
    title: "Monitor in Real-Time",
    body: "Track dryer devices, alerts, sessions, and live readings from one clean dashboard built for field work.",
    icon: "speedometer-outline" as const,
  },
  {
    title: "AI-Powered Control",
    body: "Use predictive control and the grAIn Assistant to get dryer recommendations and safer automation.",
    icon: "hardware-chip-outline" as const,
  },
];

function compactPhone(phoneNumber?: string): string {
  return phoneNumber ?? "";
}

export function PostLoginSetupGate() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const accountId = user?._id ?? user?.id ?? user?.email ?? "";
  const [isChecking, setIsChecking] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? "");
  const [phoneNumber, setPhoneNumber] = useState(compactPhone(user?.phoneNumber));
  const [location, setLocation] = useState(user?.location ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const currentOnboarding = onboardingScreens[onboardingIndex];

  const initials = useMemo(() => {
    const words = (user?.name ?? "User").trim().split(/\s+/);
    return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
  }, [user?.name]);

  useEffect(() => {
    if (!accountId) {
      setIsChecking(false);
      setProfileVisible(false);
      setOnboardingVisible(false);
      return;
    }

    let isMounted = true;
    const loadState = async () => {
      setIsChecking(true);
      const [profileDone, onboardingDone] = await Promise.all([
        AsyncStorage.getItem(profileKey(accountId)),
        AsyncStorage.getItem(onboardingKey(accountId)),
      ]);

      if (!isMounted) {
        return;
      }

      setProfileImage(user?.profileImage ?? "");
      setPhoneNumber(compactPhone(user?.phoneNumber));
      setLocation(user?.location ?? "");
      setBio(user?.bio ?? "");
      setProfileVisible(profileDone !== "true");
      setOnboardingVisible(profileDone === "true" && onboardingDone !== "true");
      setOnboardingIndex(0);
      setIsChecking(false);
    };

    void loadState();
    return () => {
      isMounted = false;
    };
  }, [accountId, user?.bio, user?.location, user?.phoneNumber, user?.profileImage]);

  const showOnboardingIfNeeded = async () => {
    if (!accountId) {
      return;
    }

    const onboardingDone = await AsyncStorage.getItem(onboardingKey(accountId));
    if (onboardingDone !== "true") {
      setOnboardingIndex(0);
      setOnboardingVisible(true);
    }
  };

  const finishProfileStep = async () => {
    if (!accountId) {
      return;
    }

    await AsyncStorage.setItem(profileKey(accountId), "true");
    setProfileVisible(false);
    await showOnboardingIfNeeded();
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Photo access is needed to choose a profile picture", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ["images"],
      quality: 0.45,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setProfileImage(asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri);
  };

  const completeProfile = async () => {
    setIsSaving(true);
    try {
      await grainApi.profile.update({
        profileImage,
        phoneNumber: phoneNumber.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      await refreshUser().catch(() => undefined);
      await finishProfileStep();
      showToast("Profile completed", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to complete profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const skipProfile = async () => {
    await finishProfileStep();
  };

  const advanceOnboarding = async () => {
    if (!accountId) {
      return;
    }

    if (onboardingIndex < onboardingScreens.length - 1) {
      setOnboardingIndex((index) => index + 1);
      return;
    }

    await AsyncStorage.setItem(onboardingKey(accountId), "true");
    setOnboardingVisible(false);
  };

  if (isChecking || !user) {
    return null;
  }

  return (
    <>
      <Modal animationType="slide" transparent visible={profileVisible} onRequestClose={skipProfile}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Complete your profile</Text>
              <Text style={styles.subtitle}>Add details that help grAIn personalize your drying assistant.</Text>

              <Pressable accessibilityRole="button" onPress={pickProfileImage} style={styles.avatarButton}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons color="#FFFFFF" name="camera" size={17} />
                </View>
              </Pressable>

              <Text style={styles.label}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="Optional"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={phoneNumber}
              />

              <Text style={styles.label}>Location / Farm location</Text>
              <TextInput
                onChangeText={setLocation}
                placeholder="Barangay, city, province"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={location}
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                multiline
                onChangeText={setBio}
                placeholder="Optional"
                placeholderTextColor={COLORS.textSecondary}
                style={[styles.input, styles.bioInput]}
                value={bio}
              />

              <Pressable disabled={isSaving} onPress={completeProfile} style={[styles.primaryButton, isSaving && styles.disabled]}>
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Complete Profile</Text>}
              </Pressable>

              <Pressable accessibilityRole="button" onPress={skipProfile} style={styles.textButton}>
                <Text style={styles.textButtonText}>Skip for now</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent visible={onboardingVisible} onRequestClose={advanceOnboarding}>
        <View style={styles.modalBackdrop}>
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingIcon}>
              <Ionicons color={COLORS.primary} name={currentOnboarding.icon} size={38} />
            </View>
            <Text style={styles.title}>{currentOnboarding.title}</Text>
            <Text style={styles.subtitle}>{currentOnboarding.body}</Text>
            <View style={styles.dots}>
              {onboardingScreens.map((screen) => (
                <View
                  key={screen.title}
                  style={[
                    styles.dot,
                    onboardingScreens[onboardingIndex].title === screen.title && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <Pressable onPress={advanceOnboarding} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {onboardingIndex === onboardingScreens.length - 1 ? "Let's get started!" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    marginVertical: SPACING.sm,
    width: 88,
  },
  avatarImage: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  bioInput: {
    height: 92,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 2,
    bottom: 0,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 34,
  },
  disabled: {
    opacity: 0.65,
  },
  dot: {
    backgroundColor: "#D6DED2",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginVertical: SPACING.md,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5C0",
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    height: 50,
    paddingHorizontal: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginTop: SPACING.sm,
  },
  modalBackdrop: {
    backgroundColor: "rgba(17, 17, 20, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  onboardingCard: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    margin: SPACING.lg,
    padding: SPACING.xl,
    width: "88%",
  },
  onboardingIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#EEF8F0",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 64,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
  },
  sheetContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: "center",
  },
  textButton: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
  },
  textButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
});
