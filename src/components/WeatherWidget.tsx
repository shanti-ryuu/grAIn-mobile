import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { WeatherData } from "@/api/grain-api-client";
import { useTheme } from "@/context/ThemeContext";
import { COLORS, SPACING } from "@/utils/constants";

type WeatherIconName = "location" | "cloud" | "humidity" | "wind" | "grain" | "warning" | "sun";

const FORECAST_CARD_WIDTH = 93;
const FORECAST_CARD_GAP = 12;
// ScrollView snaps one full card plus one gap at a time, so cards never rest half-cut.
const FORECAST_SNAP_INTERVAL = FORECAST_CARD_WIDTH + FORECAST_CARD_GAP;

type WeatherWidgetProps = {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  cachedAt?: number | null;
  onEnable: () => void;
  onRefresh: () => void;
};

function WeatherSvgIcon({ name, color, size = 20 }: { name: WeatherIconName; color: string; size?: number }) {
  const shared = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === "location" ? (
        <>
          <Path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" {...shared} />
          <Circle cx="12" cy="9" r="2.4" {...shared} />
        </>
      ) : null}
      {name === "cloud" ? <Path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.2-1.8A4.8 4.8 0 0 0 7 18z" {...shared} /> : null}
      {name === "humidity" ? <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" {...shared} /> : null}
      {name === "wind" ? (
        <>
          <Path d="M4 8h10a3 3 0 1 0-3-3" {...shared} />
          <Path d="M4 13h14a3 3 0 1 1-3 3" {...shared} />
          <Path d="M4 18h7" {...shared} />
        </>
      ) : null}
      {name === "grain" ? (
        <>
          <Path d="M7 17c6.5 0 10-4.5 10-10-6.5 0-10 4.5-10 10z" {...shared} />
          <Path d="M7 17 17 7" {...shared} />
        </>
      ) : null}
      {name === "warning" ? (
        <>
          <Path d="M12 3 2.8 20h18.4L12 3z" {...shared} />
          <Path d="M12 9v5" {...shared} />
          <Path d="M12 17h.01" {...shared} />
        </>
      ) : null}
      {name === "sun" ? (
        <>
          <Circle cx="12" cy="12" r="4" {...shared} />
          <Line x1="12" x2="12" y1="2" y2="5" {...shared} />
          <Line x1="12" x2="12" y1="19" y2="22" {...shared} />
          <Line x1="2" x2="5" y1="12" y2="12" {...shared} />
          <Line x1="19" x2="22" y1="12" y2="12" {...shared} />
        </>
      ) : null}
    </Svg>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function cacheText(cachedAt?: number | null): string {
  if (!cachedAt) {
    return "";
  }
  return `Last cached ${new Date(cachedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function WeatherWidget({
  weather,
  loading,
  error,
  permissionDenied,
  cachedAt,
  onEnable,
  onRefresh,
}: WeatherWidgetProps) {
  const { theme } = useTheme();
  const humidity = weather?.current.humidity ?? 0;
  const accent = humidity > 85 ? COLORS.danger : weather?.dryingAdvice.suitable === false ? COLORS.warning : COLORS.success;

  if (loading && !weather) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Loading local weather...</Text>
        </View>
      </View>
    );
  }

  if (permissionDenied && !weather) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgCard, borderColor: COLORS.warning }]}>
        <View style={styles.row}>
          <WeatherSvgIcon color={COLORS.warning} name="location" />
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Enable location for weather data</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Weather improves drying recommendations but the app still works without it.</Text>
          </View>
          <Pressable onPress={onEnable} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>Enable</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!weather) {
    return (
      <Pressable onPress={onRefresh} style={[styles.container, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <View style={styles.row}>
          <WeatherSvgIcon color={COLORS.idle} name="cloud" />
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Weather unavailable</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{cacheText(cachedAt) || error || "Tap to retry."}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push("/weather-detail" as never)}
      style={[styles.container, { backgroundColor: theme.bgCard, borderColor: accent }]}
    >
      <View style={styles.row}>
        <WeatherSvgIcon color={accent} name="location" />
        <Text style={[styles.locationText, { color: theme.textPrimary }]} numberOfLines={1}>
          {weather.current.cityName || weather.location.cityName}, {weather.current.country || weather.location.country}
        </Text>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.conditionRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${accent}1A` }]}>
            <WeatherSvgIcon color={accent} name={weather.current.cloudCover > 60 ? "cloud" : "sun"} size={24} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{weather.current.description}</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Feels like {weather.current.feelsLike.toFixed(0)} C</Text>
          </View>
        </View>
        <Text style={[styles.temperature, { color: theme.textPrimary }]}>{weather.current.temperature.toFixed(0)} C</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <WeatherSvgIcon color={COLORS.info} name="humidity" size={16} />
          <Text style={[styles.metricText, { color: theme.textSecondary }]}>Humidity: {weather.current.humidity.toFixed(0)}%</Text>
        </View>
        <View style={styles.metric}>
          <WeatherSvgIcon color={COLORS.primary} name="wind" size={16} />
          <Text style={[styles.metricText, { color: theme.textSecondary }]}>Wind: {weather.current.windSpeed.toFixed(1)} m/s</Text>
        </View>
      </View>

      <View style={[styles.adviceBox, { backgroundColor: `${accent}14` }]}>
        <WeatherSvgIcon color={accent} name={weather.dryingAdvice.suitable ? "grain" : "warning"} size={18} />
        <View style={styles.flex}>
          <Text style={[styles.adviceTitle, { color: accent }]}>
            Drying: {weather.dryingAdvice.suitable ? "Suitable" : "Weather Caution"}
          </Text>
          <Text style={[styles.bodyText, { color: theme.textPrimary }]} numberOfLines={2}>
            {weather.dryingAdvice.recommendation}
          </Text>
        </View>
      </View>

      <ScrollView
        decelerationRate="fast"
        horizontal={true}
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={FORECAST_SNAP_INTERVAL}
        contentContainerStyle={styles.forecastRow}
      >
        {weather.forecast.map((item) => (
          <View key={item.datetime} style={[styles.forecastCard, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}>
            <Text style={[styles.forecastTime, { color: theme.textPrimary }]}>{formatTime(item.datetime)}</Text>
            <WeatherSvgIcon color={item.rainProbability > 0.3 ? COLORS.warning : COLORS.primary} name={item.rainProbability > 0.3 ? "cloud" : "sun"} />
            <Text style={[styles.forecastTemp, { color: theme.textPrimary }]}>{item.temperature.toFixed(0)} C</Text>
            <Text style={[styles.forecastMeta, { color: theme.textSecondary }]}>{item.humidity.toFixed(0)}%</Text>
          </View>
        ))}
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adviceBox: {
    alignItems: "flex-start",
    borderRadius: 14,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  adviceTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  bodyText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  conditionRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: SPACING.sm,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    gap: SPACING.sm,
    minHeight: 176,
    padding: SPACING.md,
  },
  flex: {
    flex: 1,
  },
  forecastCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginRight: FORECAST_CARD_GAP,
    width: FORECAST_CARD_WIDTH,
    padding: SPACING.sm,
  },
  forecastMeta: {
    fontSize: 11,
    fontWeight: "800",
  },
  forecastRow: {
    paddingRight: FORECAST_CARD_WIDTH,
    paddingTop: SPACING.xs,
  },
  forecastTemp: {
    fontSize: 14,
    fontWeight: "900",
  },
  forecastTime: {
    fontSize: 11,
    fontWeight: "900",
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    minHeight: 132,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  mainRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  metricText: {
    fontSize: 12,
    fontWeight: "800",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  smallButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  temperature: {
    fontSize: 28,
    fontWeight: "900",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "capitalize",
  },
});
