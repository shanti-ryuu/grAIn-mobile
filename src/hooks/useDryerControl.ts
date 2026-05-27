import AsyncStorage from "@react-native-async-storage/async-storage";
import { off, onValue, ref } from "firebase/database";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DeviceSummary, grainApi } from "@/api/grain-api-client";
import { db } from "@/lib/firebase";
import { enqueueCommand } from "@/utils/commandQueue";

type DryerMode = "AUTO" | "MANUAL";
export type CommandStatus = "idle" | "sent" | "confirmed" | "timeout" | "failed" | "queued";

interface DryerControlState {
  mode: DryerMode;
  isRunning: boolean;
  temperature: number;
  fanSpeed: number;
  isControlling: boolean;
  commandStatus: CommandStatus;
  aiAutoStopped: boolean;
  selectedDevice: DeviceSummary | null;
  selectedDeviceId: string | null;
  setMode: (mode: DryerMode) => void;
  setTemperature: (temperature: number) => void;
  setFanSpeed: (fanSpeed: number) => void;
  setSelectedDevice: (device: DeviceSummary | null) => void;
  setCommandStatus: (status: CommandStatus) => void;
  handleStart: (deviceId: string, mode: DryerMode, temperature: number, fanSpeed: number) => Promise<void>;
  handleStop: (deviceId: string) => Promise<void>;
}

const STORAGE_KEYS = {
  mode: "control_mode",
  isRunning: "control_isRunning",
  temperature: "control_temperature",
  fanSpeed: "control_fanSpeed",
  selectedDeviceId: "control_selectedDeviceId",
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function waitForAcknowledgement(deviceId: string, timeoutMs = 15000): Promise<CommandStatus> {
  return new Promise((resolve) => {
    if (!db) {
      resolve("sent");
      return;
    }

    const runtimeRef = ref(db, `grain/devices/${deviceId}/runtimeState`);
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      off(runtimeRef);
      resolve("timeout");
    }, timeoutMs);

    onValue(runtimeRef, (snapshot) => {
      const value = snapshot.val() as { commandAcknowledged?: boolean } | null;
      if (!settled && value?.commandAcknowledged === true) {
        settled = true;
        clearTimeout(timeout);
        off(runtimeRef);
        resolve("confirmed");
      }
    });
  });
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("network") || message.includes("timeout") || message.includes("server");
}

export function useDryerControl(): DryerControlState {
  const [mode, setModeState] = useState<DryerMode>("MANUAL");
  const [isRunning, setIsRunning] = useState(false);
  const [temperature, setTemperatureState] = useState(45);
  const [fanSpeed, setFanSpeedState] = useState(80);
  const [isControlling, setIsControlling] = useState(false);
  const [commandStatus, setCommandStatus] = useState<CommandStatus>("idle");
  const [aiAutoStopped] = useState(false);
  const [selectedDevice, setSelectedDeviceState] = useState<DeviceSummary | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
      const values = Object.fromEntries(entries);

      if (!mounted) {
        return;
      }

      const savedMode = values[STORAGE_KEYS.mode];
      if (savedMode === "AUTO" || savedMode === "MANUAL") {
        setModeState(savedMode);
      }
      setIsRunning(values[STORAGE_KEYS.isRunning] === "true");
      setTemperatureState(clamp(Number(values[STORAGE_KEYS.temperature] ?? 45), 35, 75));
      setFanSpeedState(clamp(Number(values[STORAGE_KEYS.fanSpeed] ?? 80), 0, 100));
      setSelectedDeviceId(values[STORAGE_KEYS.selectedDeviceId] ?? null);
    };

    void loadState();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((key: string, value: string) => {
    void AsyncStorage.setItem(key, value);
  }, []);

  const setMode = useCallback(
    (nextMode: DryerMode) => {
      setModeState(nextMode);
      persist(STORAGE_KEYS.mode, nextMode);
    },
    [persist],
  );

  const setTemperature = useCallback(
    (value: number) => {
      const next = clamp(value, 35, 75);
      setTemperatureState(next);
      persist(STORAGE_KEYS.temperature, String(next));
    },
    [persist],
  );

  const setFanSpeed = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 100);
      setFanSpeedState(next);
      persist(STORAGE_KEYS.fanSpeed, String(next));
    },
    [persist],
  );

  const setSelectedDevice = useCallback(
    (device: DeviceSummary | null) => {
      setSelectedDeviceState(device);
      setSelectedDeviceId(device?.deviceId ?? null);
      if (device) {
        persist(STORAGE_KEYS.selectedDeviceId, device.deviceId);
      } else {
        void AsyncStorage.removeItem(STORAGE_KEYS.selectedDeviceId);
      }
    },
    [persist],
  );

  const handleStart = useCallback(
    async (deviceId: string, startMode: DryerMode, startTemperature: number, startFanSpeed: number) => {
      setIsControlling(true);
      try {
        await grainApi.dryer.start(deviceId, startMode, startTemperature, startFanSpeed);
        setCommandStatus("sent");
        setIsRunning(true);
        persist(STORAGE_KEYS.isRunning, "true");
        const ackStatus = await waitForAcknowledgement(deviceId);
        setCommandStatus(ackStatus);
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueueCommand({
            id: `cmd-${Date.now()}`,
            deviceId,
            commandType: "dryer.start",
            payload: { mode: startMode, temperature: startTemperature, fanSpeed: startFanSpeed },
            queuedAt: new Date().toISOString(),
          });
          setCommandStatus("queued");
        } else {
          setCommandStatus("failed");
        }
      } finally {
        setIsControlling(false);
      }
    },
    [persist],
  );

  const handleStop = useCallback(
    async (deviceId: string) => {
      setIsControlling(true);
      try {
        await grainApi.dryer.stop(deviceId);
        setCommandStatus("sent");
        setIsRunning(false);
        persist(STORAGE_KEYS.isRunning, "false");
        const ackStatus = await waitForAcknowledgement(deviceId);
        setCommandStatus(ackStatus);
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueueCommand({
            id: `cmd-${Date.now()}`,
            deviceId,
            commandType: "dryer.stop",
            payload: {},
            queuedAt: new Date().toISOString(),
          });
          setCommandStatus("queued");
        } else {
          setCommandStatus("failed");
        }
      } finally {
        setIsControlling(false);
      }
    },
    [persist],
  );

  return useMemo(
    () => ({
      mode,
      isRunning,
      temperature,
      fanSpeed,
      isControlling,
      commandStatus,
      aiAutoStopped,
      selectedDevice,
      selectedDeviceId,
      setMode,
      setTemperature,
      setFanSpeed,
      setSelectedDevice,
      setCommandStatus,
      handleStart,
      handleStop,
    }),
    [
      aiAutoStopped,
      commandStatus,
      fanSpeed,
      handleStart,
      handleStop,
      isControlling,
      isRunning,
      mode,
      selectedDevice,
      selectedDeviceId,
      setFanSpeed,
      setMode,
      setSelectedDevice,
      setTemperature,
      temperature,
    ],
  );
}
