import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useToast } from "@/context/ToastContext";
import { useLogout } from "@/hooks/useLogout";
import { COLORS, SPACING } from "@/utils/constants";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { handleLogout } = useLogout();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
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
      })
      .catch(() => undefined);
  }, []);

  const avatarText = useMemo(() => initials(profile?.name ?? "User"), [profile?.name]);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await grainApi.profile.update({ name, bio, phoneNumber, location });
      const updated = await grainApi.profile.get();
      setProfile(updated);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? "User"}</Text>
        <Text style={styles.email}>{profile?.email ?? ""}</Text>
        <StatusBadge status={profile?.role ?? "farmer"} size="sm" />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Info</Text>
          <Pressable onPress={() => setEditOpen(true)} style={styles.iconButton}>
            <Ionicons name="create" size={20} color={COLORS.primary} />
          </Pressable>
        </View>
        <InfoLine label="Bio" value={profile?.bio ?? "Not set"} />
        <InfoLine label="Phone" value={profile?.phoneNumber ?? "Not set"} />
        <InfoLine label="Location" value={profile?.location ?? "Not set"} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>
        <TextInput
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
          style={styles.input}
          value={currentPassword}
        />
        <TextInput
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
          style={styles.input}
          value={newPassword}
        />
        <TextInput
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          style={styles.input}
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
          <View style={styles.modalSheet}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>
            <TextInput onChangeText={setName} placeholder="Name" style={styles.input} value={name} />
            <TextInput multiline onChangeText={setBio} placeholder="Bio" style={[styles.input, styles.textArea]} value={bio} />
            <TextInput onChangeText={setPhoneNumber} placeholder="Phone number" style={styles.input} value={phoneNumber} />
            <TextInput onChangeText={setLocation} placeholder="Location" style={styles.input} value={location} />
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
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
