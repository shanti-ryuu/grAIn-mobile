import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { SPACING } from "@/utils/constants";
import { useTheme } from "@/context/ThemeContext";
import { haptics } from "@/utils/haptics";

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(isDark ? 0.4 : 0.12);

  const animatedStyle = useAnimatedStyle(() => ({
    elevation: shadowOpacity.value * 10,
    shadowOpacity: shadowOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.bgCard, borderColor: theme.border, shadowColor: theme.shadow },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={() => {
        void haptics.light();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        shadowOpacity.value = withSpring(isDark ? 0.52 : 0.18, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        shadowOpacity.value = withSpring(isDark ? 0.4 : 0.12, { damping: 15, stiffness: 300 });
      }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 0.5,
    padding: SPACING.md,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
});
