import { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { Butil } from "@/components/mascot/Butil";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { COLORS } from "@/utils/constants";
import { useFloatingTabOffset } from "@/utils/layout";

export function AssistantFAB() {
  const { openAssistant } = useAssistant();
  const { theme } = useTheme();
  const bottom = useFloatingTabOffset(22);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.wrap, { bottom, transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open grAIn Assistant"
        onPress={openAssistant}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.button, { backgroundColor: theme.accentPrimary }]}
      >
        <Butil mood="happy" size={58} speaking />
        <View style={[styles.chatBadge, { backgroundColor: theme.accentPrimary }]}>
          <View style={styles.chatDot} />
          <View style={styles.chatDot} />
          <View style={styles.chatDot} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderColor: "#FFFFFF",
    borderRadius: 34,
    borderWidth: 2,
    elevation: 5,
    height: 68,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    width: 68,
  },
  chatBadge: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 2,
    bottom: 4,
    flexDirection: "row",
    gap: 2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 32,
  },
  chatDot: {
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  wrap: {
    position: "absolute",
    right: 18,
    zIndex: 1000,
  },
});
