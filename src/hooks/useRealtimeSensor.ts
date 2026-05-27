import { off, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";

const OFFLINE_AFTER_MS = 2 * 60 * 1000;
const RECENT_ACTIVITY_GRACE_MS = 30 * 1000;

export interface RealtimeSensorData {
  temperature?: number;
  humidity?: number;
  moisture?: number;
  fanSpeed?: number;
  energy?: number;
  status?: string;
  solarVoltage?: number;
  solarCurrent?: number;
  weight?: number;
  updatedAt?: string;
}

export type RuntimeState = Record<string, string | number | boolean | null | undefined>;

interface UseRealtimeSensorResult {
  sensorData: RealtimeSensorData | null;
  runtimeState: RuntimeState | null;
  isOnline: "online" | "offline";
  lastUpdated: string | null;
}

function parseLastActive(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function deriveOnlineStatus(
  status: unknown,
  lastActiveMs: number | null,
  nowMs: number
): "online" | "offline" {
  const ageMs = lastActiveMs === null ? Number.POSITIVE_INFINITY : nowMs - lastActiveMs;
  if (ageMs <= RECENT_ACTIVITY_GRACE_MS) {
    return "online";
  }

  return status === "online" && ageMs <= OFFLINE_AFTER_MS ? "online" : "offline";
}

export function useRealtimeSensor(deviceId: string): UseRealtimeSensorResult {
  const [sensorData, setSensorData] = useState<RealtimeSensorData | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<unknown>(null);
  const [lastActiveMs, setLastActiveMs] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const isOnline = deriveOnlineStatus(firebaseStatus, lastActiveMs, nowMs);

  useEffect(() => {
    if (!deviceId || !db) {
      return;
    }

    const sensorRef = ref(db, `grain/devices/${deviceId}/sensors`);
    const statusRef = ref(db, `grain/devices/${deviceId}/status`);
    const runtimeRef = ref(db, `grain/devices/${deviceId}/runtimeState`);
    const lastActiveRef = ref(db, `grain/devices/${deviceId}/lastActive`);

    onValue(sensorRef, (snapshot) => {
      const value = snapshot.val() as RealtimeSensorData | null;
      setSensorData(value);
      if (value?.updatedAt) {
        setLastUpdated(value.updatedAt);
      }
    });

    onValue(statusRef, (snapshot) => {
      setFirebaseStatus(snapshot.val());
    });

    onValue(runtimeRef, (snapshot) => {
      setRuntimeState(snapshot.val() as RuntimeState | null);
    });

    onValue(lastActiveRef, (snapshot) => {
      const value = snapshot.val();
      const parsed = parseLastActive(value);
      setLastActiveMs(parsed);
      setLastUpdated(parsed ? new Date(parsed).toISOString() : null);
    });

    return () => {
      off(sensorRef);
      off(statusRef);
      off(runtimeRef);
      off(lastActiveRef);
    };
  }, [deviceId]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  return { sensorData, runtimeState, isOnline, lastUpdated };
}
