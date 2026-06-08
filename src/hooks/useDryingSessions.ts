import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";

import { grainApi, SessionSummary } from "@/api/grain-api-client";
import { getListData } from "@/utils/data";

interface UseDryingSessionsResult {
  sessions: SessionSummary[];
  activeSession: SessionSummary | null;
  isLoading: boolean;
  error: string | null;
  startSession: (deviceId: string, grainType?: string, targetMoisture?: number, mode?: "AUTO" | "MANUAL") => Promise<void>;
  endSession: (sessionId: string, action: "complete" | "abort") => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDryingSessions(deviceId?: string): UseDryingSessionsResult {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const [sessionsResponse, activeResponse] = await Promise.all([
        grainApi.sessions.list({ deviceId }),
        grainApi.sessions.getActive(deviceId),
      ]);
      setSessions(getListData<SessionSummary>(sessionsResponse));
      setActiveSession(getListData<SessionSummary>(activeResponse)[0] ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  const startSession = useCallback(
    async (nextDeviceId: string, grainType = "rice", targetMoisture = 14, mode: "AUTO" | "MANUAL" = "MANUAL") => {
      await grainApi.sessions.start({ deviceId: nextDeviceId, grainType, targetMoisture, mode });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await refetch();
    },
    [refetch],
  );

  const endSession = useCallback(
    async (sessionId: string, action: "complete" | "abort") => {
      await grainApi.sessions.end(sessionId, action);
      if (action === "complete") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      await refetch();
    },
    [refetch],
  );

  return { sessions, activeSession, isLoading, error, startSession, endSession, refetch };
}
