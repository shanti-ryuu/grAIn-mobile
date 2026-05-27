import { useCallback, useEffect, useState } from "react";

import { grainApi, NotificationSummary } from "@/api/grain-api-client";
import { getListData, getPaginationTotal } from "@/utils/data";

interface UseNotificationsResult {
  notifications: NotificationSummary[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (ids?: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const [listResponse, unreadResponse] = await Promise.all([
        grainApi.notifications.list({ limit: 10 }),
        grainApi.notifications.list({ unread: true, limit: 1 }),
      ]);
      const items = getListData<NotificationSummary>(listResponse);
      const unreadItems = getListData<NotificationSummary>(unreadResponse);
      setNotifications(items);
      setUnreadCount(getPaginationTotal(unreadResponse, unreadItems.length));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  const markAsRead = useCallback(
    async (ids?: string[]) => {
      await grainApi.notifications.markRead(ids);
      await refetch();
    },
    [refetch],
  );

  return { notifications, unreadCount, isLoading, markAsRead, refetch };
}
