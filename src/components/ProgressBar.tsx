import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/context/ThemeContext";

export function ProgressBar({ value }: { value: number }) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);
  const shimmer = useSharedValue(-120);
  const target = Math.max(0, Math.min(100, value));

  useEffect(() => {
    progress.value = withSpring(target, { damping: 20, stiffness: 100 });
  }, [progress, target]);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(140, { duration: 1200 }), withTiming(-120, { duration: 0 })),
      -1,
      false,
    );
  }, [shimmer]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <View style={[styles.track, { backgroundColor: theme.bgElevated }]}>
      <Animated.View style={[styles.fillWrap, fillStyle]}>
        <LinearGradient colors={[theme.accentPrimary, theme.statusOnline, theme.accentPrimaryLight]} style={styles.fill} />
        {target < 100 ? <Animated.View style={[styles.shimmer, shimmerStyle]} /> : null}
      </Animated.View>
      <View style={[styles.marker, { borderColor: theme.statusDanger }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  fillWrap: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  marker: {
    borderLeftWidth: 1,
    borderStyle: "dashed",
    bottom: -2,
    position: "absolute",
    right: 0,
    top: -2,
  },
  shimmer: {
    backgroundColor: "rgba(255,255,255,0.22)",
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 70,
  },
  track: {
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
  },
});
