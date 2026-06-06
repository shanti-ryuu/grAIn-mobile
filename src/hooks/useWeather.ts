import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

import { WeatherData, grainApi } from "@/api/grain-api-client";

type WeatherLocation = {
  lat: number;
  lon: number;
};

type PermissionStatus = Location.PermissionStatus | null;

type CachedWeather = {
  data: WeatherData;
  cachedAt: number;
  lat: number;
  lon: number;
};

const WEATHER_CACHE_KEY = "cached_weather";
const FRESH_CACHE_MS = 30 * 60 * 1000;
const FALLBACK_CACHE_MS = 60 * 60 * 1000;

function parseCachedWeather(raw: string | null): CachedWeather | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedWeather;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function readCachedWeather(maxAgeMs: number): Promise<CachedWeather | null> {
  const parsed = parseCachedWeather(await AsyncStorage.getItem(WEATHER_CACHE_KEY));
  if (!parsed || Date.now() - parsed.cachedAt > maxAgeMs) {
    return null;
  }
  return parsed;
}

export function useWeather(autoFetch = true) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    return status === Location.PermissionStatus.GRANTED;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
    };
    setLocation(next);
    return loc.coords;
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await grainApi.weather.get(lat, lon);
      setWeather(data);
      setLocation({ lat, lon });
      setCachedAt(Date.now());
      await AsyncStorage.setItem(
        WEATHER_CACHE_KEY,
        JSON.stringify({
          data,
          cachedAt: Date.now(),
          lat,
          lon,
        }),
      );
      return data;
    } catch (fetchError) {
      const cached = await readCachedWeather(FALLBACK_CACHE_MS);
      if (cached) {
        setWeather(cached.data);
        setLocation({ lat: cached.lat, lon: cached.lon });
        setCachedAt(cached.cachedAt);
      }
      setError(fetchError instanceof Error ? fetchError.message : "Weather unavailable");
      return cached?.data ?? null;
    } finally {
      setLoading(false);
    }
  }, []);

  const initWeather = useCallback(async () => {
    const cached = await readCachedWeather(FRESH_CACHE_MS);
    if (cached) {
      setWeather(cached.data);
      setLocation({ lat: cached.lat, lon: cached.lon });
      setCachedAt(cached.cachedAt);
      return cached.data;
    }

    setLoading(true);
    try {
      const granted = await requestPermission();
      if (!granted) {
        setError("Location permission is needed for local weather.");
        return null;
      }
      const coords = await getCurrentLocation();
      return await fetchWeather(coords.latitude, coords.longitude);
    } catch (initError) {
      const fallback = await readCachedWeather(FALLBACK_CACHE_MS);
      if (fallback) {
        setWeather(fallback.data);
        setLocation({ lat: fallback.lat, lon: fallback.lon });
        setCachedAt(fallback.cachedAt);
      }
      setError(initError instanceof Error ? initError.message : "Weather unavailable");
      return fallback?.data ?? null;
    } finally {
      setLoading(false);
    }
  }, [fetchWeather, getCurrentLocation, requestPermission]);

  useEffect(() => {
    if (autoFetch) {
      void initWeather();
    }
  }, [autoFetch, initWeather]);

  return {
    weather,
    location,
    loading,
    error,
    permissionStatus,
    cachedAt,
    refetch: initWeather,
    fetchWeather,
    requestPermission,
  };
}
