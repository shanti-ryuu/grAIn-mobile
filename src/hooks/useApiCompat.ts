import { useEffect, useState } from "react";

import { grainApi, NotificationSummary } from "@/api/grain-api-client";
import { getListData } from "@/utils/data";
import { loadNotificationPreferences, shouldShowNotification } from "@/utils/notificationPreferences";

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [response, preferences] = await Promise.all([
          grainApi.notifications.list({ unread: true, limit: 100 }),
          loadNotificationPreferences(),
        ]);
        const alerts = getListData<NotificationSummary>(response)
          .filter((notification) => shouldShowNotification(notification, preferences));
        if (mounted) {
          setCount(alerts.length);
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
