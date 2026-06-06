import { ReactNode } from "react";
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AnimatePressableProps = {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AnimatePressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressScale = 0.96,
  style,
  ...props
}: AnimatePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        if (!disabled) {
          scale.value = withSpring(pressScale, { damping: 16, stiffness: 420, mass: 0.6 });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 460, mass: 0.55 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
