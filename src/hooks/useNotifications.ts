import { useCallback, useEffect, useState } from "react";

import { grainApi, NotificationSummary } from "@/api/grain-api-client";
import { getListData, getPaginationTotal } from "@/utils/data";
import {
  loadNotificationPreferences,
  shouldShowNotification,
} from "@/utils/notificationPreferences";

interface UseNotificationsResult {
  notifications: NotificationSummary[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  markAsRead: (ids?: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

const PAGE_SIZE = 20;

export function useNotifications(filter?: (notification: NotificationSummary) => boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const preferences = await loadNotificationPreferences();
      const [listResponse, unreadResponse] = await Promise.all([
        grainApi.notifications.list({ page: 1, limit: PAGE_SIZE }),
        grainApi.notifications.list({ unread: true, limit: 100 }),
      ]);
      const items = getListData<NotificationSummary>(listResponse)
        .filter((notification) => shouldShowNotification(notification, preferences))
        .filter((notification) => (filter ? filter(notification) : true));
      const unreadItems = getListData<NotificationSummary>(unreadResponse)
        .filter((notification) => shouldShowNotification(notification, preferences))
        .filter((notification) => (filter ? filter(notification) : true));
      setNotifications(items);
      setUnreadCount(unreadItems.length);
      setPage(1);
      setHasMore(getPaginationTotal(listResponse, items.length) > PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const preferences = await loadNotificationPreferences();
      const response = await grainApi.notifications.list({ page: nextPage, limit: PAGE_SIZE });
      const items = getListData<NotificationSummary>(response)
        .filter((notification) => shouldShowNotification(notification, preferences))
        .filter((notification) => (filter ? filter(notification) : true));
      setNotifications((current) => [...current, ...items]);
      setPage(nextPage);
      setHasMore(nextPage * PAGE_SIZE < getPaginationTotal(response, 0));
    } finally {
      setIsLoadingMore(false);
    }
  }, [filter, hasMore, isLoadingMore, page]);

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

  return { notifications, unreadCount, isLoading, isLoadingMore, hasMore, markAsRead, loadMore, refetch };
}
