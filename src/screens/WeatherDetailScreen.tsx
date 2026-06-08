import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WeatherData } from "@/api/grain-api-client";
import { useTheme } from "@/context/ThemeContext";
import { useWeather } from "@/hooks/useWeather";
import { COLORS, SPACING } from "@/utils/constants";
import { useBottomTabPadding } from "@/utils/layout";

const HOUR_CARD_WIDTH = 93;
const HOUR_CARD_GAP = 12;
const HOUR_SNAP_INTERVAL = HOUR_CARD_WIDTH + HOUR_CARD_GAP;

type WeatherGlyphName = "cloud" | "sun" | "rain" | "wind" | "humidity" | "leaf";

function WeatherGlyph({ name, color = "#FFFFFF", size = 24 }: { name: WeatherGlyphName; color?: string; size?: number }) {
  const shared = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === "sun" ? (
        <>
          <Circle cx="12" cy="12" r="4" {...shared} />
          <Line x1="12" x2="12" y1="2" y2="5" {...shared} />
          <Line x1="12" x2="12" y1="19" y2="22" {...shared} />
          <Line x1="2" x2="5" y1="12" y2="12" {...shared} />
          <Line x1="19" x2="22" y1="12" y2="12" {...shared} />
        </>
      ) : null}
      {name === "cloud" ? <Path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.2-1.8A4.8 4.8 0 0 0 7 18z" {...shared} /> : null}
      {name === "rain" ? (
        <>
          <Path d="M7 15h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.2-1.8A4.8 4.8 0 0 0 7 15z" {...shared} />
          <Line x1="8" x2="7" y1="19" y2="22" {...shared} />
          <Line x1="13" x2="12" y1="19" y2="22" {...shared} />
          <Line x1="18" x2="17" y1="19" y2="22" {...shared} />
        </>
      ) : null}
      {name === "wind" ? (
        <>
          <Path d="M4 8h10a3 3 0 1 0-3-3" {...shared} />
          <Path d="M4 13h14a3 3 0 1 1-3 3" {...shared} />
          <Path d="M4 18h7" {...shared} />
        </>
      ) : null}
      {name === "humidity" ? <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" {...shared} /> : null}
      {name === "leaf" ? (
        <>
          <Path d="M7 17c6.5 0 10-4.5 10-10-6.5 0-10 4.5-10 10z" {...shared} />
          <Path d="M7 17 17 7" {...shared} />
        </>
      ) : null}
    </Svg>
  );
}

function formatHour(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(value: string, offset = 0): string {
  const date = new Date(value);
  date.setDate(date.getDate() + offset);
  if (offset === 0) {
    return "Today";
  }
  if (offset === 1) {
    return "Tomorrow";
  }
  return date.toLocaleDateString([], { weekday: "long" });
}

function glyphForForecast(item: WeatherData["forecast"][number] | WeatherData["current"]): WeatherGlyphName {
  const description = item.description.toLowerCase();
  if (description.includes("rain") || ("rainProbability" in item && item.rainProbability > 0.3)) {
    return "rain";
  }
  if (description.includes("clear") || ("cloudCover" in item && item.cloudCover < 40)) {
    return "sun";
  }
  return "cloud";
}

function gradientForWeather(weather: WeatherData | null): [string, string, string] {
  const description = weather?.current.description.toLowerCase() ?? "";
  if (description.includes("rain")) {
    return ["#2E4D40", "#15251C", "#08110C"];
  }
  if (description.includes("clear")) {
    return ["#4CA35A", "#1F5C2B", "#0B1B10"];
  }
  if (description.includes("cloud") || description.includes("overcast")) {
    return ["#7D927F", "#2D4634", "#0A120D"];
  }
  return ["#5C8F61", "#254D2A", "#09120D"];
}

function buildDailyRows(weather: WeatherData) {
  const source = weather.forecast.length > 0 ? weather.forecast : [];
  return Array.from({ length: 7 }, (_, index) => {
    const item = source[index % Math.max(1, source.length)];
    return {
      day: formatDay(weather.current.timestamp, index),
      humidity: item ? item.humidity : weather.current.humidity,
      high: item ? item.temperature : weather.current.temperature,
      low: item ? Math.max(item.temperature - 3, 0) : Math.max(weather.current.temperature - 3, 0),
      glyph: item ? glyphForForecast(item) : glyphForForecast(weather.current),
      rainProbability: item?.rainProbability ?? 0,
    };
  });
}

function buildPlanningWindows(weather: WeatherData) {
  return weather.forecast
    .map((item) => {
      const humidityScore = Math.max(0, 100 - item.humidity);
      const rainScore = Math.max(0, 100 - item.rainProbability * 100);
      const windScore = Math.min(100, item.windSpeed * 25);
      const score = Math.round(humidityScore * 0.45 + rainScore * 0.35 + windScore * 0.2);
      const suitable = item.humidity < 75 && item.rainProbability < 0.25 && item.windSpeed > 0.5;
      return {
        ...item,
        score,
        suitable,
        advice: suitable
          ? "Good window for drying. Keep normal fan settings and monitor moisture."
          : item.humidity >= 80
            ? "Humidity is high. Prefer indoor drying or raise fan speed."
            : item.rainProbability >= 0.25
              ? "Rain risk is elevated. Avoid outdoor-dependent solar planning."
              : "Marginal airflow. Monitor fan performance closely."
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function FrostedPanel({ children, style }: { children: React.ReactNode; style?: object }) {
  const { isDark } = useTheme();
  return (
    <BlurView
      intensity={isDark ? 36 : 28}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.frostedPanel,
        {
          backgroundColor: isDark ? "rgba(18, 28, 20, 0.62)" : "rgba(255,255,255,0.18)",
          borderColor: isDark ? "rgba(92,224,113,0.16)" : "rgba(255,255,255,0.24)",
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

export function WeatherDetailScreen() {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabPadding(24);
  const { weather, loading, error, permissionStatus, refetch } = useWeather(true);
  const dailyRows = weather ? buildDailyRows(weather) : [];
  const planningWindows = weather ? buildPlanningWindows(weather) : [];
  const accentText = isDark ? theme.accentPrimaryLight : "rgba(255,255,255,0.84)";

  return (
    <LinearGradient colors={gradientForWeather(weather)} style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: bottomPadding + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: isDark ? "rgba(18,28,20,0.72)" : "rgba(255,255,255,0.16)" }]}
          >
            <Ionicons color="#FFFFFF" name="chevron-back" size={28} />
          </Pressable>
          <Text style={styles.navTitle}>Weather</Text>
          <Pressable
            accessibilityLabel="Refresh weather"
            onPress={() => void refetch()}
            style={[styles.backButton, { backgroundColor: isDark ? "rgba(18,28,20,0.72)" : "rgba(255,255,255,0.16)" }]}
          >
            <Ionicons color="#FFFFFF" name="refresh" size={21} />
          </Pressable>
        </View>

        {!weather && loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={styles.loadingText}>Loading local weather...</Text>
          </View>
        ) : null}

        {!weather && !loading ? (
          <FrostedPanel style={styles.emptyPanel}>
            <WeatherGlyph name="cloud" size={34} />
            <Text style={styles.emptyTitle}>Weather unavailable</Text>
            <Text style={styles.emptyText}>
              {permissionStatus === "denied" ? "Enable location permission to load local weather." : error || "Pull back and try again."}
            </Text>
          </FrostedPanel>
        ) : null}

        {weather ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.city}>{weather.current.cityName || weather.location.cityName}</Text>
              <Text style={styles.currentTemp}>{weather.current.temperature.toFixed(0)}°</Text>
              <Text style={styles.condition}>{weather.current.description}</Text>
              <Text style={styles.highLow}>
                Feels like {weather.current.feelsLike.toFixed(0)}°  Humidity {weather.current.humidity.toFixed(0)}%
              </Text>
            </View>

            <FrostedPanel>
              <View style={styles.panelHeader}>
                <WeatherGlyph color={accentText} name="leaf" size={18} />
                <Text style={styles.panelTitle}>Drying conditions</Text>
              </View>
              <Text style={styles.adviceText}>{weather.dryingAdvice.recommendation}</Text>
            </FrostedPanel>

            <FrostedPanel>
              <View style={styles.panelHeader}>
                <Ionicons name="calendar-outline" size={18} color={accentText} />
                <Text style={styles.panelTitle}>Forecast planning</Text>
              </View>
              <Text style={styles.adviceText}>
                Best upcoming drying windows based on humidity, rain risk, and airflow.
              </Text>
              <View style={styles.plannerList}>
                {planningWindows.map((item) => (
                  <View key={`plan-${item.datetime}`} style={styles.plannerRow}>
                    <View style={styles.plannerTime}>
                      <Text style={styles.plannerHour}>{formatHour(item.datetime)}</Text>
                      <Text style={styles.plannerScore}>{item.score}/100</Text>
                    </View>
                    <View style={styles.plannerBody}>
                      <Text style={styles.plannerTitle}>{item.suitable ? "Recommended" : "Use caution"}</Text>
                      <Text style={styles.plannerText}>{item.advice}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </FrostedPanel>

            <FrostedPanel>
              <Text style={styles.panelTitle}>Hourly forecast</Text>
              <ScrollView
                decelerationRate="fast"
                horizontal={true}
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={HOUR_SNAP_INTERVAL}
                contentContainerStyle={styles.hourlyRow}
              >
                {weather.forecast.map((item) => (
                  <View
                    key={item.datetime}
                    style={[
                      styles.hourCard,
                      {
                        backgroundColor: isDark ? "rgba(19,27,20,0.72)" : "rgba(255,255,255,0.16)",
                        borderColor: isDark ? "rgba(92,224,113,0.14)" : "rgba(255,255,255,0.18)",
                      },
                    ]}
                  >
                    <Text style={styles.hourText}>{formatHour(item.datetime)}</Text>
                    <WeatherGlyph name={glyphForForecast(item)} size={24} />
                    <Text style={styles.hourTemp}>{item.temperature.toFixed(0)}°</Text>
                    <Text style={styles.hourMeta}>{item.humidity.toFixed(0)}%</Text>
                  </View>
                ))}
              </ScrollView>
            </FrostedPanel>

            <FrostedPanel>
              <Text style={styles.panelTitle}>7-day forecast</Text>
              <View style={styles.dailyList}>
                {dailyRows.map((day, index) => (
                  <View key={`${day.day}-${index}`} style={[styles.dayRow, index === dailyRows.length - 1 && styles.lastDayRow]}>
                    <Text style={styles.dayName}>{day.day}</Text>
                    <WeatherGlyph name={day.glyph} size={22} />
                    <Text style={styles.dayRain}>{Math.round(day.rainProbability * 100)}%</Text>
                    <Text style={styles.dayTemp}>
                      {day.low.toFixed(0)}° / {day.high.toFixed(0)}°
                    </Text>
                  </View>
                ))}
              </View>
            </FrostedPanel>

            <FrostedPanel>
              <View style={styles.metricGrid}>
                <View style={styles.metricItem}>
                  <WeatherGlyph name="humidity" size={20} />
                  <Text style={styles.metricLabel}>Humidity</Text>
                  <Text style={styles.metricValue}>{weather.current.humidity.toFixed(0)}%</Text>
                </View>
                <View style={styles.metricItem}>
                  <WeatherGlyph name="wind" size={20} />
                  <Text style={styles.metricLabel}>Wind</Text>
                  <Text style={styles.metricValue}>{weather.current.windSpeed.toFixed(1)} m/s</Text>
                </View>
              </View>
            </FrostedPanel>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  adviceText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 8,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  city: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "500",
    letterSpacing: -0.8,
  },
  condition: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 18,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  content: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  currentTemp: {
    color: "#FFFFFF",
    fontSize: 108,
    fontWeight: "200",
    letterSpacing: -6,
    lineHeight: 116,
    marginLeft: 10,
  },
  dailyList: {
    marginTop: 8,
  },
  dayName: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  dayRain: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    width: 42,
  },
  dayRow: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.18)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingVertical: 11,
  },
  dayTemp: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    width: 78,
  },
  emptyPanel: {
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 80,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  frostedPanel: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    padding: SPACING.md,
  },
  hero: {
    alignItems: "center",
    paddingBottom: SPACING.md,
    paddingTop: SPACING.md,
  },
  highLow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  hourCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    marginRight: HOUR_CARD_GAP,
    paddingVertical: 12,
    width: HOUR_CARD_WIDTH,
  },
  hourMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
  },
  hourTemp: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  hourText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "800",
  },
  hourlyRow: {
    paddingRight: HOUR_CARD_WIDTH,
    paddingTop: SPACING.md,
  },
  lastDayRow: {
    borderBottomWidth: 0,
  },
  loadingBlock: {
    alignItems: "center",
    gap: SPACING.md,
    justifyContent: "center",
    minHeight: 360,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  metricItem: {
    flex: 1,
    gap: 5,
  },
  metricLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  navRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  panelTitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  plannerBody: {
    flex: 1,
    gap: 3,
  },
  plannerHour: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  plannerList: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  plannerRow: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  plannerScore: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
  },
  plannerText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  plannerTime: {
    width: 72,
  },
  plannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  root: {
    flex: 1,
  },
});
