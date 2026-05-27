import { useEffect, useState } from "react";

import { grainApi, AlertSummary } from "@/api/grain-api-client";
import { getListData, getPaginationTotal } from "@/utils/data";

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await grainApi.alerts.getAll({ isRead: false, limit: 1 });
        const alerts = getListData<AlertSummary>(response);
        if (mounted) {
          setCount(getPaginationTotal(response, alerts.length));
        }
      } catch {
        if (mounted) {
          setCount(0);
        }
      }
    };

    void load();
    const interval = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
