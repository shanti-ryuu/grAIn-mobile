import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

export type ButilMood = "happy" | "thinking" | "excited" | "explaining" | "waving";

interface ButilProps {
  mood: ButilMood;
  size?: number;
  speaking?: boolean;
  onPress?: () => void;
}

export function Butil({ mood, size = 120, speaking = false, onPress }: ButilProps) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const armRotate = useSharedValue(0);
  const bubbleScale = useSharedValue(1);

  useEffect(() => {
    if (mood === "thinking") {
      rotate.value = withRepeat(withSequence(withTiming(-5, { duration: 900 }), withTiming(5, { duration: 900 })), -1, true);
      translateY.value = withTiming(0);
    } else if (mood === "excited") {
      translateY.value = withRepeat(withSequence(withTiming(-10, { duration: 220 }), withTiming(0, { duration: 220 })), -1, true);
      armRotate.value = withRepeat(withSequence(withTiming(-22, { duration: 180 }), withTiming(22, { duration: 180 })), -1, true);
    } else if (mood === "waving") {
      translateY.value = withRepeat(withSequence(withTiming(-4, { duration: 500 }), withTiming(0, { duration: 500 })), -1, true);
      armRotate.value = withRepeat(withSequence(withTiming(-28, { duration: 280 }), withTiming(18, { duration: 280 })), -1, true);
    } else if (mood === "explaining") {
      translateY.value = withRepeat(withSequence(withTiming(-5, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
      armRotate.value = withRepeat(withSequence(withTiming(15, { duration: 650 }), withTiming(0, { duration: 650 })), -1, true);
    } else {
      translateY.value = withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
      armRotate.value = withTiming(0);
    }
  }, [armRotate, mood, rotate, translateY]);

  useEffect(() => {
    bubbleScale.value = speaking
      ? withRepeat(
          withSequence(
            withTiming(1.08, { duration: 520, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        )
      : withSpring(1);
  }, [bubbleScale, speaking]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
  }));

  const leftArmStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-armRotate.value}deg` }],
  }));

  const rightArmStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armRotate.value}deg` }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: speaking ? 1 : 0,
  }));

  const eyePath = mood === "thinking" ? "M39 61 Q44 56 49 61" : "M39 60 Q44 64 49 60";
  const smilePath = mood === "thinking" ? "M39 83 Q50 87 61 83" : "M36 82 Q50 94 64 82";

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.wrap, { width: size, height: size * 1.3 }]}>
      <Animated.View style={[styles.speechPulse, bubbleStyle]} />
      <Animated.View style={[styles.body, bodyStyle]}>
        <Animated.View style={[styles.leftArm, leftArmStyle]}>
          <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
            <Path d="M22 76 Q6 72 9 55" stroke="#B45309" strokeWidth={4} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.rightArm, rightArmStyle]}>
          <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
            <Path d="M78 76 Q94 69 91 51" stroke="#B45309" strokeWidth={4} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
          <Ellipse cx={50} cy={68} rx={34} ry={45} fill="#F59E0B" />
          <Ellipse cx={42} cy={52} rx={9} ry={15} fill="#FBBF24" opacity={0.45} />
          <Path d="M50 25 Q45 10 36 15" stroke="#2D5A27" strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M50 25 Q60 10 68 18" stroke="#2D5A27" strokeWidth={4} strokeLinecap="round" fill="none" />
          <Circle cx={40} cy={62} r={5} fill="#111827" />
          <Circle cx={60} cy={62} r={5} fill="#111827" />
          <Path d={eyePath} stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.7} />
          <Path d={smilePath} stroke="#111827" strokeWidth={3} strokeLinecap="round" fill="none" />
          {mood === "excited" ? <Circle cx={35} cy={75} r={4} fill="#FDE68A" opacity={0.9} /> : null}
          {mood === "excited" ? <Circle cx={65} cy={75} r={4} fill="#FDE68A" opacity={0.9} /> : null}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    justifyContent: "center",
  },
  leftArm: {
    left: 0,
    position: "absolute",
    top: 0,
  },
  rightArm: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  speechPulse: {
    backgroundColor: "#FFFFFF",
    borderColor: "#2D5A27",
    borderRadius: 24,
    borderWidth: 2,
    height: 28,
    position: "absolute",
    right: 4,
    top: 4,
    width: 42,
  },
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
