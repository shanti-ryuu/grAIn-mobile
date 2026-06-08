import { useCallback, useState } from "react";

import { WeatherContext, grainApi, PredictionResponse, SensorReading } from "@/api/grain-api-client";

export interface PredictionPayload {
  deviceId: string;
  temperature: number;
  humidity: number;
  moisture: number;
  fanSpeed: number;
  timeElapsed: number;
  solarVoltage?: number;
  energyConsumed?: number;
  weatherContext?: WeatherContext;
}

interface UseAIPredictionResult {
  prediction: PredictionResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  predict: (payload: PredictionPayload) => Promise<PredictionResponse>;
  autoPredict: (
    deviceId: string,
    sensorData: SensorReading,
    onAutoStop?: () => Promise<void> | void,
  ) => Promise<PredictionResponse>;
}

const TARGET_MOISTURE = 14;

function buildCurve(moisture: number, rate: number): { minutesFromNow: number; predictedMoisture: number }[] {
  return Array.from({ length: 13 }, (_, index) => {
    const minutesFromNow = index * 30;
    return {
      minutesFromNow,
      predictedMoisture: Math.max(TARGET_MOISTURE, moisture - rate * minutesFromNow),
    };
  });
}

function localFallback(payload: PredictionPayload): PredictionResponse {
  const tempFactor = 1 + ((payload.temperature - 40) / 40) * 0.6;
  const fanFactor = 0.4 + (payload.fanSpeed / 100) * 0.6;
  const rate = Math.max(0.001, 0.008 * tempFactor * fanFactor);
  const predictedMoisture30min = Math.max(TARGET_MOISTURE, payload.moisture - rate * 30);
  const estimatedMinutesToTarget =
    predictedMoisture30min <= TARGET_MOISTURE
      ? 0
      : Math.ceil((payload.moisture - TARGET_MOISTURE) / rate);
  const isDryingComplete = payload.moisture <= TARGET_MOISTURE;
  const confidence = 65;
  const margin = Math.max(0.3, 3.2 - confidence * 0.028);
  const recommendationType =
    payload.temperature > 65 || payload.moisture < 10 ? "critical" : payload.temperature < 38 || payload.humidity > 75 ? "warning" : "optimal";

  return {
    predictedMoisture30min,
    estimatedMinutesToTarget: Math.max(0, estimatedMinutesToTarget),
    recommendation: isDryingComplete
      ? "Drying complete. Stop the dryer to prevent over-drying."
      : recommendationType === "warning"
        ? "Adjust conditions and keep monitoring moisture."
        : recommendationType === "critical"
          ? "Stop or reduce heat immediately and inspect the dryer."
          : "Drying conditions are stable. Continue monitoring.",
    recommendationType,
    efficiencyScore: Math.max(0, Math.min(100, Math.round(rate * 8000))),
    confidence,
    confidenceInterval: {
      lowerMoisture: Math.max(TARGET_MOISTURE, Number((predictedMoisture30min - margin).toFixed(2))),
      upperMoisture: Number((predictedMoisture30min + margin).toFixed(2)),
      margin: Number(margin.toFixed(2)),
      confidenceLevel: confidence,
    },
    isDryingComplete,
    projectedCurve: buildCurve(payload.moisture, rate),
    targetMoisture: TARGET_MOISTURE,
    algorithm: "local-fallback",
    modelSelection: {
      selectedModel: "local-fallback",
      reason: "Local rule-based fallback selected because the backend prediction service was unreachable.",
      candidates: [],
    },
    weatherEnhanced: Boolean(payload.weatherContext),
    weatherContext: payload.weatherContext ?? null,
    dryingConditionNote: payload.weatherContext
      ? payload.weatherContext.outdoorHumidity > payload.humidity + 15
        ? `Outdoor humidity is ${payload.weatherContext.outdoorHumidity.toFixed(0)}%, so drying may be slower than predicted.`
        : "Weather conditions were included in this fallback prediction."
      : "Weather context was not included in this prediction.",
  };
}

export function useAIPrediction(): UseAIPredictionResult {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const predict = useCallback(async (payload: PredictionPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await grainApi.ai.predict({ ...payload });
      setPrediction(result);
      setLastFetchedAt(Date.now());
      return result;
    } catch (predictError) {
      const fallback = localFallback(payload);
      setPrediction(fallback);
      setLastFetchedAt(Date.now());
      setError(predictError instanceof Error ? predictError.message : "Using local fallback prediction");
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const autoPredict = useCallback(
    async (deviceId: string, sensorData: SensorReading, onAutoStop?: () => Promise<void> | void) => {
      const result = await predict({
        deviceId,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        moisture: sensorData.moisture,
        fanSpeed: sensorData.fanSpeed ?? 80,
        timeElapsed: 0,
        solarVoltage: sensorData.solarVoltage,
        energyConsumed: sensorData.energy,
      });

      if (result.isDryingComplete) {
        await onAutoStop?.();
      }

      return result;
    },
    [predict],
  );

  return { prediction, isLoading, error, lastFetchedAt, predict, autoPredict };
}
