import { onValue, ref } from "firebase/database";
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

export type PredictiveControlState = {
  enabled?: boolean;
  status?: "idle" | "cooldown" | "action_sent" | "maintaining";
  lastAction?: "STOP" | "EMERGENCY_STOP" | "REDUCE_TEMP" | "INCREASE_FAN" | "MAINTAIN";
  lastActionAt?: string;
  nextAllowedAt?: string;
  reason?: string;
  commandId?: string;
};

export type RuntimeState = Record<string, string | number | boolean | null | undefined | PredictiveControlState>;

interface UseRealtimeSensorResult {
  sensorData: RealtimeSensorData;
  runtimeState: RuntimeState;
  isOnline: boolean | null;
  lastUpdated: string | null;
}

const DEFAULT_SENSOR_DATA: RealtimeSensorData = {
  temperature: 0,
  humidity: 0,
  moisture: 0,
  fanSpeed: 0,
  energy: 0,
  status: "offline",
  solarVoltage: 0,
  solarCurrent: 0,
  weight: 0,
  updatedAt: undefined,
};

const DEFAULT_RUNTIME_STATE: RuntimeState = {
  fan1State: "OFF",
  fan2State: "OFF",
  heaterState: "OFF",
  relayState: "OFF",
  stepperState: "OFF",
  currentMode: "MANUAL",
  isRunning: false,
};

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSensorData(value: unknown): RealtimeSensorData {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    temperature: numberOrZero(data.temperature),
    humidity: numberOrZero(data.humidity),
    moisture: numberOrZero(data.moisture),
    fanSpeed: numberOrZero(data.fanSpeed),
    solarVoltage: numberOrZero(data.solarVoltage),
    solarCurrent: numberOrZero(data.solarCurrent),
    weight: numberOrZero(data.weight),
    energy: numberOrZero(data.energy),
    status: typeof data.status === "string" ? data.status : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

function normalizeRuntimeState(value: unknown): RuntimeState {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const stateValue = (nextValue: unknown, fallback: string) =>
    typeof nextValue === "string" || typeof nextValue === "number" || typeof nextValue === "boolean" || nextValue === null
      ? nextValue
      : fallback;

  return {
    ...DEFAULT_RUNTIME_STATE,
    fan1State: stateValue(data.fan1State, "OFF"),
    fan2State: stateValue(data.fan2State, "OFF"),
    heaterState: stateValue(data.heaterState, "OFF"),
    relayState: stateValue(data.relayState, "OFF"),
    stepperState: stateValue(data.stepperState, "OFF"),
    currentMode: stateValue(data.currentMode, "MANUAL"),
    isRunning: data.isRunning === true,
    predictiveControl:
      data.predictiveControl && typeof data.predictiveControl === "object"
        ? (data.predictiveControl as PredictiveControlState)
        : undefined,
  };
}

function normalizePredictiveControl(value: unknown): PredictiveControlState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as PredictiveControlState;
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
): boolean | null {
  if (status === "online" || status === "offline") {
    return status === "online";
  }

  if (status !== "online" && status !== "offline" && lastActiveMs === null) {
    return null;
  }

  const ageMs = lastActiveMs === null ? Number.POSITIVE_INFINITY : nowMs - lastActiveMs;
  if (ageMs <= RECENT_ACTIVITY_GRACE_MS) {
    return true;
  }

  return status === "online" && ageMs <= OFFLINE_AFTER_MS;
}

export function useRealtimeSensor(deviceId?: string | null): UseRealtimeSensorResult {
  const [sensorData, setSensorData] = useState<RealtimeSensorData>(DEFAULT_SENSOR_DATA);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(DEFAULT_RUNTIME_STATE);
  const [firebaseStatus, setFirebaseStatus] = useState<unknown>(null);
  const [lastActiveMs, setLastActiveMs] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const isOnline = deriveOnlineStatus(firebaseStatus, lastActiveMs, nowMs);

  useEffect(() => {
    if (!deviceId || !db) {
      setSensorData(DEFAULT_SENSOR_DATA);
      setRuntimeState(DEFAULT_RUNTIME_STATE);
      setFirebaseStatus(null);
      setLastActiveMs(null);
      setLastUpdated(null);
      return;
    }

    const sensorRef = ref(db, `grain/devices/${deviceId}/sensors`);
    const statusRef = ref(db, `grain/devices/${deviceId}/status`);
    const runtimeRef = ref(db, `grain/devices/${deviceId}/runtimeState`);
    const predictiveControlRef = ref(db, `grain/devices/${deviceId}/predictiveControl`);
    const lastActiveRef = ref(db, `grain/devices/${deviceId}/lastActive`);

    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      const value = normalizeSensorData(snapshot.val());
      setSensorData(value);
      if (value?.updatedAt) {
        setLastUpdated(value.updatedAt);
      }
    });

    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      setFirebaseStatus(snapshot.val());
    });

    const unsubscribeRuntime = onValue(runtimeRef, (snapshot) => {
      setRuntimeState(normalizeRuntimeState(snapshot.val()));
    });

    const unsubscribePredictiveControl = onValue(predictiveControlRef, (snapshot) => {
      const predictiveControl = normalizePredictiveControl(snapshot.val());
      setRuntimeState((current) => ({ ...current, predictiveControl }));
    });

    const unsubscribeLastActive = onValue(lastActiveRef, (snapshot) => {
      const value = snapshot.val();
      const parsed = parseLastActive(value);
      setLastActiveMs(parsed);
      setLastUpdated(parsed ? new Date(parsed).toISOString() : null);
    });

    return () => {
      unsubscribeSensor();
      unsubscribeStatus();
      unsubscribeRuntime();
      unsubscribePredictiveControl();
      unsubscribeLastActive();
    };
  }, [deviceId]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  return { sensorData, runtimeState, isOnline, lastUpdated };
}
