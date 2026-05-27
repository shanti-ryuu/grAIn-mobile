import { useCallback, useEffect, useState } from "react";

import { DeviceSummary, grainApi } from "@/api/grain-api-client";

interface UseDeviceResult {
  device: DeviceSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDevice(id: string): UseDeviceResult {
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setDevice(await grainApi.devices.getById(id));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load device");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { device, isLoading, error, refetch };
}
