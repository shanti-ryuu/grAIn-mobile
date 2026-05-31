import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import * as ReactNative from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Butil } from "@/components/mascot/Butil";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { COLORS } from "@/utils/constants";

const STORAGE_KEY = "assistant_button_position";
const BUTTON_SIZE = 68;
const TAP_THRESHOLD = 5;
const EDGE_PADDING = 16;
const PanResponder = (ReactNative as unknown as { PanResponder: { create: (config: Record<string, unknown>) => { panHandlers: Record<string, unknown> } } }).PanResponder;

type StoredPosition = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function AssistantFAB() {
  const { openAssistant } = useAssistant();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get("window");
  const bounds = {
    minX: EDGE_PADDING,
    maxX: screen.width - BUTTON_SIZE - EDGE_PADDING,
    minY: insets.top + EDGE_PADDING,
    maxY: screen.height - insets.bottom - BUTTON_SIZE - 80,
  };
  const defaultPosition = {
    x: bounds.maxX,
    y: clamp(screen.height - 160, bounds.minY, bounds.maxY),
  };
  const positionRef = useRef<StoredPosition>(defaultPosition);
  const dragStartRef = useRef<StoredPosition>(defaultPosition);
  const dragDistanceRef = useRef(0);
  const x = useRef(new Animated.Value(defaultPosition.x)).current;
  const y = useRef(new Animated.Value(defaultPosition.y)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!mounted || !stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored) as StoredPosition;
        const next = {
          x: clamp(parsed.x, bounds.minX, bounds.maxX),
          y: clamp(parsed.y, bounds.minY, bounds.maxY),
        };
        positionRef.current = next;
        x.setValue(next.x);
        y.setValue(next.y);
      } catch {
        // Ignore malformed stored positions.
      }
    });

    return () => {
      mounted = false;
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, x, y]);

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = positionRef.current;
        dragDistanceRef.current = 0;
        animateScale(0.92);
      },
      onPanResponderMove: (_event: unknown, gesture: { dx: number; dy: number }) => {
        dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(gesture.dx, gesture.dy));
        const next = {
          x: clamp(dragStartRef.current.x + gesture.dx, bounds.minX, bounds.maxX),
          y: clamp(dragStartRef.current.y + gesture.dy, bounds.minY, bounds.maxY),
        };
        positionRef.current = next;
        x.setValue(next.x);
        y.setValue(next.y);
      },
      onPanResponderRelease: () => {
        animateScale(1);

        if (dragDistanceRef.current < TAP_THRESHOLD) {
          openAssistant();
          return;
        }

        const current = positionRef.current;
        const snapX = current.x + BUTTON_SIZE / 2 < screen.width / 2 ? bounds.minX : bounds.maxX;
        const next = { x: snapX, y: clamp(current.y, bounds.minY, bounds.maxY) };
        positionRef.current = next;
        Animated.parallel([
          Animated.spring(x, {
            toValue: next.x,
            useNativeDriver: false,
          }),
          Animated.spring(y, {
            toValue: next.y,
            useNativeDriver: false,
          }),
        ]).start(() => {
          void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        });
      },
      onPanResponderTerminate: () => {
        animateScale(1);
      },
    }),
  ).current;

  return (
    <Animated.View
      accessibilityRole="button"
      accessibilityLabel="Open grAIn Assistant"
      {...panResponder.panHandlers}
      style={[styles.wrap, { left: x, top: y }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.button, { backgroundColor: theme.accentPrimary }]}>
          <Butil mood="happy" size={58} speaking />
          <View style={[styles.chatBadge, { backgroundColor: theme.accentPrimary }]}>
            <View style={styles.chatDot} />
            <View style={styles.chatDot} />
            <View style={styles.chatDot} />
          </View>
        </View>
      </Animated.View>
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
    elevation: 9,
    height: 68,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
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
    zIndex: 1000,
  },
});
