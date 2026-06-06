import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { tabs } from "@/components/Navigation";
import { useUnreadNotificationCount } from "@/hooks/useApiCompat";
import { useTheme } from "@/context/ThemeContext";
import { haptics } from "@/utils/haptics";
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from "@/utils/layout";

const visibleNames: string[] = tabs.map((tab) => tab.name);
const INNER_PADDING = 6;
const ACTIVE_PILL_WIDTH = 56;
const ACTIVE_PILL_HEIGHT = 38;
type TabLayout = { x: number; width: number };
type TabLayoutEvent = { nativeEvent: { layout: TabLayout } };

function iconForState(icon: keyof typeof Ionicons.glyphMap, active: boolean): keyof typeof Ionicons.glyphMap {
  const raw = String(icon);
  if (!active) {
    const outline = `${raw.replace("-outline", "")}-outline` as keyof typeof Ionicons.glyphMap;
    return Ionicons.glyphMap[outline] ? outline : icon;
  }
  return raw.endsWith("-outline") ? (raw.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : icon;
}

function TabButton({
  icon,
  active,
  onPress,
  badgeCount,
  onLayout,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  badgeCount?: number;
  onLayout: (layout: TabLayout) => void;
}) {
  const { isDark, theme } = useTheme();
  const inactiveIconColor = isDark ? "#8E8E93" : "#636366";
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
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 16, stiffness: 420, mass: 0.6 });
      }}
      onPressOut={() => {
        scale.value = withSpring(active ? 1.04 : 1, { damping: 14, stiffness: 460, mass: 0.55 });
      }}
      onLayout={(event: TabLayoutEvent) => onLayout(event.nativeEvent.layout)}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconSlot, iconStyle]}>
        <Ionicons
          name={iconForState(icon, active)}
          size={active ? 26 : 25}
          color={active ? theme.accentPrimary : inactiveIconColor}
          style={!active && styles.inactiveIcon}
        />
      </Animated.View>
      {badgeCount && badgeCount > 0 ? (
        <Animated.View style={[styles.badge, { backgroundColor: theme.statusDanger }, badgeStyle]}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
  const visibleRoutes = state.routes.filter((route) => visibleNames.includes(route.name));
  const unreadAlerts = useUnreadNotificationCount();
  const activeRoute = state.routes[state.index];
  const activeLayout = activeRoute ? tabLayouts[activeRoute.key] : undefined;
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(ACTIVE_PILL_WIDTH);
  const indicatorOpacity = useSharedValue(0);

  useEffect(() => {
    if (!activeLayout) {
      return;
    }

    const targetX = activeLayout.x + activeLayout.width / 2 - ACTIVE_PILL_WIDTH / 2;
    indicatorOpacity.value = withSpring(1, { damping: 18, stiffness: 260 });
    indicatorX.value = withSpring(targetX, { damping: 22, stiffness: 230, mass: 0.75 });
    indicatorWidth.value = withSequence(
      withSpring(ACTIVE_PILL_WIDTH * 1.14, { damping: 17, stiffness: 260, mass: 0.65 }),
      withDelay(40, withSpring(ACTIVE_PILL_WIDTH, { damping: 19, stiffness: 300, mass: 0.55 })),
    );
  }, [activeLayout, indicatorOpacity, indicatorWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const Container = Platform.OS === "ios" || Platform.OS === "android" ? BlurView : View;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: TAB_BAR_BOTTOM_GAP,
        },
      ]}
    >
      <Container
        intensity={isDark ? 48 : 62}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.45)",
            borderColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.60)",
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              backgroundColor: isDark ? "rgba(92,224,113,0.20)" : "rgba(46,117,49,0.15)",
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
              onLayout={(layout) => {
                setTabLayouts((current) => {
                  const previous = current[route.key];
                  if (previous?.x === layout.x && previous.width === layout.width) {
                    return current;
                  }
                  return { ...current, [route.key]: layout };
                });
              }}
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
  activePill: {
    alignItems: "center",
    borderRadius: 12,
    height: ACTIVE_PILL_HEIGHT,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    top: (TAB_BAR_HEIGHT - ACTIVE_PILL_HEIGHT) / 2,
    zIndex: 1,
  },
  badge: {
    alignItems: "center",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: 16,
    top: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  container: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 0.5,
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    justifyContent: "space-around",
    overflow: "hidden",
    paddingHorizontal: INNER_PADDING,
  },
  iconSlot: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
  },
  inactiveIcon: {
    opacity: 0.9,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
    zIndex: 2,
  },
  wrap: {
    elevation: 40,
    alignSelf: "center",
    borderRadius: 30,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    width: "92%",
    zIndex: 9999,
  },
});
