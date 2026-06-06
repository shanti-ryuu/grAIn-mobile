import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AlertSummary } from "@/api/grain-api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";
import { relativeTime } from "@/utils/data";

type AlertCardProps = {
  alert: Pick<AlertSummary, "type" | "message" | "createdAt" | "isRead"> & Partial<Pick<AlertSummary, "deviceId">>;
  onDismiss?: () => void;
  onPress?: () => void;
  variant?: "default" | "notification";
};

const grainIcon = require("../../assets/grAIn_icon_192x192.png");

function colorForType(type: AlertSummary["type"]): string {
  if (type === "critical") {
    return COLORS.danger;
  }
  if (type === "warning") {
    return COLORS.warning;
  }
  return COLORS.info;
}

function iconForType(type: AlertSummary["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "critical") {
    return "alert-circle";
  }
  if (type === "warning") {
    return "warning";
  }
  return "information-circle";
}

export function AlertCard({ alert, onDismiss, onPress, variant = "default" }: AlertCardProps) {
  const color = colorForType(alert.type);
  const { isDark, theme } = useTheme();
  const translateX = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      swipeOpacity.value = interpolate(Math.abs(event.translationX), [0, 170], [1, 0.35], Extrapolation.CLAMP);
    })
    .onEnd((event) => {
      if (onDismiss && Math.abs(event.translationX) > 112) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 420, { duration: 180 });
        swipeOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        });
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 260 });
      swipeOpacity.value = withSpring(1, { damping: 18, stiffness: 260 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    opacity: swipeOpacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  if (variant === "notification") {
    return (
      <GestureDetector gesture={swipeGesture}>
        <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)} style={swipeStyle}>
          <MotiView
            animate={{ opacity: 1, scale: 1 }}
            from={{ opacity: 0, scale: 0.9 }}
          >
            <Pressable
              disabled={!onPress}
              onPress={onPress}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
                  borderColor: isDark ? "#2C2C2E" : "transparent",
                  shadowOpacity: isDark ? 0.18 : 0.025,
                },
                alert.isRead && (isDark ? styles.notificationReadCardDark : styles.readCard),
              ]}
            >
              <View style={styles.notificationMetaRow}>
                <View style={styles.notificationAppMeta}>
                  <View
                    style={[
                      styles.notificationIconFrame,
                      {
                        backgroundColor: isDark ? "#2C2C2E" : "rgba(255,255,255,0.72)",
                        borderColor: isDark ? "#3A3A3C" : "rgba(255,255,255,0.90)",
                      },
                    ]}
                  >
                    <Image source={grainIcon} style={styles.notificationIcon} />
                  </View>
                  <View style={styles.notificationTitleBlock}>
                    <Text style={[styles.notificationAppName, { color: isDark ? "#F4F6F8" : "#333333" }]} numberOfLines={1}>
                      Mobile dryer monitor
                    </Text>
                    {alert.deviceId ? (
                      <Text style={[styles.notificationDevice, { color: isDark ? "#A5ACB5" : "#8E8E93" }]} numberOfLines={1}>
                        {alert.deviceId}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.notificationTime, { color: isDark ? "#8E949B" : "#8E8E93" }]}>
                  {relativeTime(alert.createdAt)}
                </Text>
              </View>
              <View style={styles.notificationBodyRow}>
                <View style={[styles.notificationStatusDot, { backgroundColor: color }]} />
                <Text style={[styles.notificationMessage, { color: isDark ? "#F4F6F8" : "#1C1C1E" }]} numberOfLines={3}>
                  {alert.message}
                </Text>
              </View>
            </Pressable>
          </MotiView>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, alert.isRead && styles.readCard]}
    >
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.iconWrap}>
        <Ionicons name={iconForType(alert.type)} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <StatusBadge status={alert.type} size="sm" />
          {!alert.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={[styles.message, { color: theme.textPrimary }]} numberOfLines={2}>
          {alert.message}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {alert.deviceId ? `${alert.deviceId} - ` : ""}
          {relativeTime(alert.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: "stretch",
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 14,
    width: 5,
  },
  card: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingRight: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: SPACING.sm,
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  notificationAppMeta: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    minWidth: 0,
  },
  notificationAppName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  notificationBodyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    minHeight: 106,
    overflow: "hidden",
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.025,
    shadowRadius: 8,
  },
  notificationDevice: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  notificationIcon: {
    height: 28,
    opacity: 0.78,
    width: 28,
  },
  notificationIconFrame: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 0.5,
    height: 44,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    width: 44,
  },
  notificationMessage: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.15,
    lineHeight: 21,
  },
  notificationMetaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  notificationStatusDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6.5,
    opacity: 0.85,
    width: 8,
  },
  notificationTime: {
    fontSize: 13,
    fontWeight: "700",
  },
  notificationTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  readCard: {
    opacity: 0.58,
  },
  notificationReadCardDark: {
    opacity: 0.86,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  unreadDot: {
    backgroundColor: COLORS.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
});
