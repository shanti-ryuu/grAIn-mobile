import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Butil } from "@/components/mascot/Butil";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { COLORS } from "@/utils/constants";
import { subscribeButilReactionVisibility } from "@/utils/butil-events";
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from "@/utils/layout";

const STORAGE_KEY = "assistant_button_position";
const BUTTON_SIZE = 68;
const EDGE_PADDING = 8;
const TOP_SAFE_MIN = 50;
const TAP_THRESHOLD = 8;
const IDLE_FADE_DELAY_MS = 3000;

type StoredPosition = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.max(min, Math.min(max, value));
}

function snapToNearestEdge(x: number, screenWidth: number, minX: number, maxX: number): number {
  "worklet";
  return x + BUTTON_SIZE / 2 < screenWidth / 2 ? minX : maxX;
}

export function AssistantFAB() {
  const { openAssistant } = useAssistant();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [reactionVisible, setReactionVisible] = useState(false);
  const screen = Dimensions.get("window");
  const bounds = useMemo(
    () => ({
      minX: EDGE_PADDING,
      maxX: screen.width - BUTTON_SIZE - EDGE_PADDING,
      minY: Math.max(TOP_SAFE_MIN, insets.top + EDGE_PADDING),
      maxY: screen.height - insets.bottom - TAB_BAR_HEIGHT - TAB_BAR_BOTTOM_GAP - BUTTON_SIZE - EDGE_PADDING,
    }),
    [insets.bottom, insets.top, screen.height, screen.width],
  );
  const defaultPosition = useMemo(
    () => ({
      x: bounds.maxX,
      y: bounds.maxY,
    }),
    [bounds.maxX, bounds.maxY],
  );

  const translateX = useSharedValue(defaultPosition.x);
  const translateY = useSharedValue(defaultPosition.y);
  const startX = useSharedValue(defaultPosition.x);
  const startY = useSharedValue(defaultPosition.y);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const dragDistance = useSharedValue(0);
  const idleOffsetY = useSharedValue(0);

  const persistPosition = (position: StoredPosition) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  };

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!mounted || !stored) {
        translateX.value = defaultPosition.x;
        translateY.value = defaultPosition.y;
        return;
      }

      try {
        const parsed = JSON.parse(stored) as StoredPosition;
        const nextY = clamp(parsed.y, bounds.minY, bounds.maxY);
        const nextX = snapToNearestEdge(parsed.x, screen.width, bounds.minX, bounds.maxX);
        translateX.value = nextX;
        translateY.value = nextY;
        persistPosition({ x: nextX, y: nextY });
      } catch {
        translateX.value = defaultPosition.x;
        translateY.value = defaultPosition.y;
      }
    });

    opacity.value = withDelay(IDLE_FADE_DELAY_MS, withTiming(0.5, { duration: 450, easing: Easing.out(Easing.cubic) }));
    idleOffsetY.value = withDelay(
      IDLE_FADE_DELAY_MS,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
      ),
    );

    return () => {
      mounted = false;
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, defaultPosition.x, defaultPosition.y, idleOffsetY, opacity, translateX, translateY]);

  useEffect(() => {
    return subscribeButilReactionVisibility(setReactionVisible);
  }, []);

  useEffect(() => {
    if (reactionVisible) {
      cancelAnimation(idleOffsetY);
      idleOffsetY.value = 0;
      opacity.value = withTiming(0, { duration: 180 });
      scale.value = withTiming(0.84, { duration: 180 });
      return;
    }

    opacity.value = withTiming(1, { duration: 180 }, () => {
      opacity.value = withDelay(IDLE_FADE_DELAY_MS, withTiming(0.5, { duration: 450 }));
      idleOffsetY.value = withDelay(
        IDLE_FADE_DELAY_MS,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
            withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
          ),
          -1,
        ),
      );
    });
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  }, [opacity, reactionVisible, scale]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      dragDistance.value = 0;
      cancelAnimation(idleOffsetY);
      idleOffsetY.value = 0;
      opacity.value = withTiming(1, { duration: 120 });
      scale.value = withSpring(0.92, { damping: 14, stiffness: 220 });
    })
    .onUpdate((event) => {
      dragDistance.value = Math.max(dragDistance.value, Math.hypot(event.translationX, event.translationY));
      // Clamp the top-left button coordinate inside the usable app viewport.
      translateX.value = clamp(startX.value + event.translationX, bounds.minX, bounds.maxX);
      translateY.value = clamp(startY.value + event.translationY, bounds.minY, bounds.maxY);
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });

      const nextX = snapToNearestEdge(translateX.value, screen.width, bounds.minX, bounds.maxX);
      const nextY = clamp(translateY.value, bounds.minY, bounds.maxY);
      // Snap horizontally to the closest edge while preserving the user's vertical placement.
      translateX.value = withSpring(nextX, { mass: 0.8, damping: 12, stiffness: 90 });
      translateY.value = withSpring(nextY, { mass: 0.8, damping: 12, stiffness: 90 });
      opacity.value = withDelay(IDLE_FADE_DELAY_MS, withTiming(0.5, { duration: 450 }));
      idleOffsetY.value = withDelay(
        IDLE_FADE_DELAY_MS,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
            withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
          ),
          -1,
        ),
      );
      runOnJS(persistPosition)({ x: nextX, y: nextY });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(TAP_THRESHOLD)
    .onBegin(() => {
      opacity.value = withTiming(1, { duration: 120 });
      cancelAnimation(idleOffsetY);
      idleOffsetY.value = 0;
      scale.value = withSpring(0.94, { damping: 14, stiffness: 240 });
    })
    .onEnd((_event, success) => {
      scale.value = withSpring(1, { damping: 14, stiffness: 240 });
      opacity.value = withDelay(IDLE_FADE_DELAY_MS, withTiming(0.5, { duration: 450 }));
      idleOffsetY.value = withDelay(
        IDLE_FADE_DELAY_MS,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
            withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.cubic) }),
          ),
          -1,
        ),
      );
      if (success) {
        runOnJS(openAssistant)();
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 240 });
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + idleOffsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityLabel="Open grAIn Assistant"
        accessibilityRole="button"
        pointerEvents={reactionVisible ? "none" : "auto"}
        style={[styles.wrap, animatedStyle]}
      >
        <View style={[styles.button, { backgroundColor: theme.accentPrimary }]}>
          <Butil mood="happy" size={58} showSpeechPulse={false} speaking />
          <View style={[styles.chatBadge, { backgroundColor: theme.accentPrimary }]}>
            <View style={styles.chatDot} />
            <View style={styles.chatDot} />
            <View style={styles.chatDot} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
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
    height: BUTTON_SIZE,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    width: BUTTON_SIZE,
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
    elevation: 30,
    height: BUTTON_SIZE,
    left: 0,
    position: "absolute",
    top: 0,
    width: BUTTON_SIZE,
    zIndex: 1000,
  },
});
