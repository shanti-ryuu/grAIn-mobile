import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { tabs } from "@/components/Navigation";
import { useUnreadNotificationCount } from "@/hooks/useApiCompat";
import { useTheme } from "@/context/ThemeContext";
import { haptics } from "@/utils/haptics";
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT, TAB_BAR_SIDE_INSET } from "@/utils/layout";

const visibleNames: string[] = tabs.map((tab) => tab.name);

function TabButton({
  label,
  icon,
  active,
  onPress,
  badgeCount,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  badgeCount?: number;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(active ? 1.08 : 1);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.04 : 1, { damping: 18, stiffness: 280 });
  }, [active, scale]);

  useEffect(() => {
    if (badgeCount && badgeCount > 0) {
      badgeScale.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
    }
  }, [badgeCount, badgeScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        void haptics.light();
        onPress();
      }}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconSlot, iconStyle]}>
        <Ionicons name={icon} size={22} color={active ? theme.tabActive : theme.tabInactive} />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[styles.label, { color: active ? theme.tabActive : theme.tabInactive, opacity: active ? 1 : 0.68 }]}
      >
        {label}
      </Text>
      {badgeCount && badgeCount > 0 ? (
        <Animated.View style={[styles.badge, { backgroundColor: theme.statusDanger }, badgeStyle]}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => visibleNames.includes(route.name));
  const activeVisibleIndex = Math.max(0, visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key));
  const indicatorX = useSharedValue(activeVisibleIndex);
  const unreadAlerts = useUnreadNotificationCount();

  useEffect(() => {
    indicatorX.value = withSpring(activeVisibleIndex, { damping: 20, stiffness: 300 });
  }, [activeVisibleIndex, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${indicatorX.value * 100}%` }],
  }));

  const Container = Platform.OS === "ios" || Platform.OS === "android" ? BlurView : View;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
          left: TAB_BAR_SIDE_INSET,
          right: TAB_BAR_SIDE_INSET,
        },
      ]}
    >
      <Container
        intensity={isDark ? 60 : 80}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.container,
          {
            backgroundColor: Platform.OS === "web" ? theme.tabBar : `${theme.tabBar}D9`,
            borderColor: theme.tabBarBorder,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.accentPrimarySubtle,
              width: `${100 / Math.max(visibleRoutes.length, 1)}%`,
            },
            indicatorStyle,
          ]}
        />
        {visibleRoutes.map((route) => {
          const tab = tabs.find((item) => item.name === route.name);
          const active = route.key === state.routes[state.index]?.key;

          if (!tab) {
            return null;
          }

          return (
            <TabButton
              active={active}
              badgeCount={route.name === "alerts" ? unreadAlerts : undefined}
              icon={tab.icon as keyof typeof Ionicons.glyphMap}
              key={route.key}
              label={tab.label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: 9,
    top: 7,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  container: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    overflow: "hidden",
  },
  iconSlot: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
  },
  indicator: {
    borderRadius: 20,
    bottom: 7,
    position: "absolute",
    top: 7,
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: 12,
    marginTop: 5,
    maxWidth: "100%",
    textAlign: "center",
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  wrap: {
    bottom: 0,
    position: "absolute",
  },
});
