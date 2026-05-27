import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ToastType } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";

type ToastProps = {
  message: string;
  type: ToastType;
  visible: boolean;
  duration: number;
  onDismiss: () => void;
};

function backgroundForType(type: ToastType, theme: ReturnType<typeof useTheme>["theme"]): string {
  switch (type) {
    case "success":
      return theme.statusOnline;
    case "error":
      return theme.statusDanger;
    case "warning":
      return theme.statusWarning;
    case "info":
      return theme.accentPrimary;
  }
}

export function Toast({ message, type, visible, duration, onDismiss }: ToastProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 160 });

    timeoutRef.current = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
      setTimeout(onDismiss, 190);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, onDismiss, opacity, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { backgroundColor: backgroundForType(type, theme) }, animatedStyle]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 16,
    top: 54,
    zIndex: 1000,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
