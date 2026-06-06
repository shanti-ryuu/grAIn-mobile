import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";

import { ButilMood } from "@/components/mascot/Butil";
import { ButilTip } from "@/components/mascot/ButilTip";
import { useTutorial } from "@/context/TutorialContext";
import { useDevices } from "@/hooks/useDevices";
import { useRealtimeSensor } from "@/hooks/useRealtimeSensor";
import { emitButilReactionVisibility } from "@/utils/butil-events";

type Reaction = {
  key: string;
  message: string;
  mood: ButilMood;
};

const debounceMs = 5 * 60 * 1000;

export function ButilReaction() {
  const { currentTutorialScreen } = useTutorial();
  const { devices } = useDevices();
  const deviceId = useMemo(() => devices.find((device) => device.status === "online")?.deviceId ?? "", [devices]);
  const { sensorData } = useRealtimeSensor(deviceId);
  const [reaction, setReaction] = useState<Reaction | null>(null);

  useEffect(() => {
    const evaluate = async () => {
      if (!sensorData) {
        return;
      }

      const nextReaction =
        typeof sensorData.moisture === "number" && sensorData.moisture <= 14
          ? {
              key: "@grain_butil_last_reaction_moisture",
              message: "Drying complete. Time to stop.",
              mood: "excited" as const,
            }
          : typeof sensorData.temperature === "number" && sensorData.temperature > 55
            ? {
                key: "@grain_butil_last_reaction_temp",
                message: "Temperature is too high. Reduce it now.",
                mood: "thinking" as const,
              }
            : typeof sensorData.humidity === "number" && sensorData.humidity > 85
              ? {
                  key: "@grain_butil_last_reaction_humidity",
                  message: "Humidity is very high. Increase fan speed.",
                  mood: "thinking" as const,
                }
              : null;

      if (!nextReaction) {
        return;
      }

      const lastShown = Number(await AsyncStorage.getItem(nextReaction.key));
      if (!Number.isFinite(lastShown) || Date.now() - lastShown > debounceMs) {
        await AsyncStorage.setItem(nextReaction.key, String(Date.now()));
        setReaction(nextReaction);
      }
    };

    void evaluate();
  }, [sensorData]);

  useEffect(() => {
    const visible = Boolean(reaction && !currentTutorialScreen);
    emitButilReactionVisibility(visible);
    return () => {
      emitButilReactionVisibility(false);
    };
  }, [currentTutorialScreen, reaction]);

  if (!reaction || currentTutorialScreen) {
    return null;
  }

  return <ButilTip mood={reaction.mood} onDismiss={() => setReaction(null)} tip={reaction.message} />;
}
