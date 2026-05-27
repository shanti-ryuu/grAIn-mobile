import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { grainApi } from "@/api/grain-api-client";

type FanTarget = "FAN1" | "FAN2" | "ALL";
type OnOff = "ON" | "OFF";
type StepperAction = "START" | "STOP" | "CW" | "CCW";

interface UseFanControlResult {
  controlFan: (fanTarget: FanTarget, fanAction: OnOff) => Promise<void>;
  controlRelay: (relayAction: OnOff) => Promise<void>;
  controlStepper: (stepperAction: StepperAction) => Promise<void>;
  controlHeater: (heaterAction: OnOff) => Promise<void>;
  isLoading: boolean;
}

export function useFanControl(deviceId: string): UseFanControlResult {
  const [isLoading, setIsLoading] = useState(false);

  const runControl = useCallback(async (operation: () => Promise<unknown>) => {
    setIsLoading(true);
    try {
      await operation();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    controlFan: (fanTarget, fanAction) => runControl(() => grainApi.dryer.controlFan(deviceId, fanTarget, fanAction)),
    controlRelay: (relayAction) => runControl(() => grainApi.dryer.controlRelay(deviceId, relayAction)),
    controlStepper: (stepperAction) => runControl(() => grainApi.dryer.controlStepper(deviceId, stepperAction)),
    controlHeater: (heaterAction) => runControl(() => grainApi.dryer.controlHeater(deviceId, heaterAction)),
    isLoading,
  };
}
