import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthUser, grainApi } from "@/api/grain-api-client";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useLogout } from "@/hooks/useLogout";
import { COLORS, SPACING } from "@/utils/constants";
import { useBottomTabPadding } from "@/utils/layout";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileScreen() {
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();
  const { handleLogout } = useLogout();
  const { theme } = useTheme();
  const bottomPadding = useBottomTabPadding(44);
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void grainApi.profile
      .get()
      .then((result) => {
        setProfile(result);
        setName(result.name);
        setBio(result.bio ?? "");
        setPhoneNumber(result.phoneNumber ?? "");
        setLocation(result.location ?? "");
        setProfileImage(result.profileImage ?? "");
      })
      .catch(() => undefined);
  }, []);

  const avatarText = useMemo(() => initials(profile?.name ?? "User"), [profile?.name]);

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
    const nextImage = asset.base64
      ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
      : asset.uri;
    setProfileImage(nextImage);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await grainApi.profile.update({ name, bio, phoneNumber, location, profileImage });
      setProfile(updated);
      setName(updated.name);
      setBio(updated.bio ?? "");
      setPhoneNumber(updated.phoneNumber ?? "");
      setLocation(updated.location ?? "");
      setProfileImage(updated.profileImage ?? "");
      void refreshUser().catch(() => undefined);
      setEditOpen(false);
      showToast("Profile updated", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await grainApi.profile.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to change password", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bgBase }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
    >
      <Card style={styles.profileCard}>
        <Pressable onPress={() => setEditOpen(true)} style={styles.avatarButton}>
          <View style={[styles.avatar, { backgroundColor: theme.accentPrimary }]}>
            {profile?.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarText}</Text>
            )}
          </View>
          <View style={[styles.avatarEditBadge, { backgroundColor: theme.accentPrimary }]}>
            <Ionicons name="camera" size={15} color="#FFFFFF" />
          </View>
        </Pressable>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{profile?.name ?? "User"}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{profile?.email ?? ""}</Text>
        <StatusBadge status={profile?.role ?? "farmer"} size="sm" />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Info</Text>
          <Pressable onPress={() => setEditOpen(true)} style={styles.iconButton}>
            <Ionicons name="create" size={20} color={theme.accentPrimary} />
          </Pressable>
        </View>
        <InfoLine label="Bio" value={profile?.bio ?? "Not set"} />
        <InfoLine label="Phone" value={profile?.phoneNumber ?? "Not set"} />
        <InfoLine label="Location" value={profile?.location ?? "Not set"} />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Change Password</Text>
        <TextInput
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
          value={currentPassword}
        />
        <TextInput
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
          value={newPassword}
        />
        <TextInput
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
          value={confirmPassword}
        />
        <Pressable disabled={isSaving} onPress={changePassword} style={styles.primaryButton}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Update Password</Text>}
        </Pressable>
      </Card>

      <Pressable onPress={() => void handleLogout()} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <Modal animationType="slide" transparent visible={editOpen} onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bgCard }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.photoEditor}>
              <View style={[styles.editAvatar, { backgroundColor: theme.accentPrimary }]}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.editAvatarImage} />
                ) : (
                  <Text style={styles.editAvatarText}>{avatarText}</Text>
                )}
              </View>
              <View style={styles.photoActions}>
                <Pressable
                  onPress={pickProfileImage}
                  style={[styles.photoButton, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
                >
                  <Ionicons name="image" size={18} color={theme.accentPrimary} />
                  <Text style={[styles.photoButtonText, { color: theme.textPrimary }]}>Choose Photo</Text>
                </Pressable>
                {profileImage ? (
                  <Pressable onPress={() => setProfileImage("")} style={styles.removePhotoButton}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <TextInput
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
              value={name}
            />
            <TextInput
              multiline
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.textArea, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
              value={bio}
            />
            <TextInput
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
              value={phoneNumber}
            />
            <TextInput
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.textPrimary }]}
              value={location}
            />
            <Pressable disabled={isSaving} onPress={saveProfile} style={styles.primaryButton}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Save Profile</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoLine}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarButton: {
    position: "relative",
  },
  avatarEditBadge: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 2,
    bottom: -1,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: -5,
    width: 30,
  },
  avatarImage: {
    borderRadius: 38,
    height: 76,
    width: 76,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  card: {
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    gap: SPACING.md,
    padding: SPACING.md,
    paddingBottom: 120,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  editAvatar: {
    alignItems: "center",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  editAvatarImage: {
    height: 72,
    width: 72,
  },
  editAvatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  infoLine: {
    gap: 3,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: COLORS.textPrimary,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.danger,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  modalBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  photoActions: {
    flex: 1,
    gap: SPACING.sm,
  },
  photoButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  photoEditor: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  removePhotoButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  removePhotoText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});
