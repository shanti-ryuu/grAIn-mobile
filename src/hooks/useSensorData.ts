import { useCallback, useEffect, useState } from "react";

import { grainApi, SensorReading } from "@/api/grain-api-client";
import { getListData } from "@/utils/data";

interface UseSensorDataResult {
  data: SensorReading[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSensorData(deviceId: string): UseSensorDataResult {
  const [data, setData] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!deviceId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await grainApi.sensors.getData(deviceId, { hours: 24 });
      setData(getListData<SensorReading>(response));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load sensor history");
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
