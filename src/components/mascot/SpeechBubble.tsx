import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { COLORS, SPACING } from "@/utils/constants";

interface SpeechBubbleProps {
  text: string;
  position?: "top" | "right";
  visible: boolean;
}

export function SpeechBubble({ text, position = "top", visible }: SpeechBubbleProps) {
  const [typedText, setTypedText] = useState("");
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = visible ? withSpring(1) : withTiming(0.92);
    opacity.value = withTiming(visible ? 1 : 0, { duration: 180 });
  }, [opacity, scale, visible]);

  useEffect(() => {
    if (!visible) {
      setTypedText("");
      return;
    }

    setTypedText("");
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setTypedText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{typedText}</Text>
      </View>
      <View style={[styles.pointer, position === "right" ? styles.pointerRight : styles.pointerBottom]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
    borderRadius: 18,
    borderWidth: 2,
    maxWidth: 250,
    padding: SPACING.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  pointer: {
    backgroundColor: COLORS.card,
    borderBottomColor: COLORS.primary,
    borderRightColor: COLORS.primary,
    borderRightWidth: 2,
    height: 16,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 16,
  },
  pointerBottom: {
    borderBottomWidth: 2,
    bottom: -6,
    left: 36,
  },
  pointerRight: {
    borderBottomWidth: 2,
    left: -6,
    top: 24,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  wrap: {
    maxWidth: 260,
  },
});
