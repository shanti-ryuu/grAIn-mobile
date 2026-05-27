import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING } from "@/utils/constants";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function PlaceholderScreen({ title, description, icon }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 290,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 72,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: SPACING.sm,
  },
});
