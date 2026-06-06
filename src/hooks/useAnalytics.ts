import { useCallback, useEffect, useRef, useState } from "react";

import { AnalyticsOverview, grainApi, SessionReportData } from "@/api/grain-api-client";

type Period = "daily" | "weekly" | "monthly";
type CacheEntry = {
  data: AnalyticsOverview;
  timestamp: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const analyticsCache = new Map<string, CacheEntry>();

function cacheKey(period: Period, deviceId?: string): string {
  return `${period}:${deviceId ?? "all"}`;
}

export function useAnalytics(period: Period, deviceId?: string) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    const key = cacheKey(period, deviceId);
    const cached = analyticsCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setData(cached.data);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const next = await grainApi.analytics.getOverview(period, deviceId);
      analyticsCache.set(key, { data: next, timestamp: Date.now() });
      if (mounted.current) {
        setData(next);
      }
    } catch (fetchError) {
      if (mounted.current) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load analytics");
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [deviceId, period]);

  useEffect(() => {
    mounted.current = true;
    void refetch();
    return () => {
      mounted.current = false;
    };
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useSessionReport(sessionId?: string | null) {
  const [data, setData] = useState<SessionReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!sessionId) {
      return null;
    }

    setIsLoading(true);
    try {
      setError(null);
      const next = await grainApi.sessions.getReport(sessionId);
      setData(next);
      return next;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load session report");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      void refetch();
    }
  }, [refetch, sessionId]);

  return { data, isLoading, error, refetch };
}
