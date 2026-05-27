import { useCallback, useEffect, useState } from "react";

import { DeviceSummary, grainApi } from "@/api/grain-api-client";
import { getListData } from "@/utils/data";

interface UseDevicesResult {
  devices: DeviceSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDevices(): UseDevicesResult {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const response = await grainApi.devices.list();
      setDevices(getListData<DeviceSummary>(response));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load devices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { devices, isLoading, error, refetch };
}
