import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Butil, ButilMood } from "@/components/mascot/Butil";
import { SpeechBubble } from "@/components/mascot/SpeechBubble";
import { COLORS, SPACING } from "@/utils/constants";

interface ButilTipProps {
  tip: string;
  mood?: ButilMood;
  onDismiss: () => void;
}

export function ButilTip({ tip, mood = "happy", onDismiss }: ButilTipProps) {
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 260 });
    opacity.value = withTiming(1, { duration: 220 });
    const timeout = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timeout);
  }, [onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable onPress={onDismiss} style={styles.card}>
        <Butil mood={mood} size={60} speaking />
        <View style={styles.bubbleWrap}>
          <SpeechBubble position="right" text={tip} visible />
        </View>
        <Ionicons name="close" size={18} color={COLORS.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    flex: 1,
  },
  card: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  wrap: {
    bottom: 150,
    left: SPACING.md,
    position: "absolute",
    right: SPACING.md,
    zIndex: 900,
  },
});
