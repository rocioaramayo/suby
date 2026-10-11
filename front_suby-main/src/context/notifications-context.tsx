import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getUserNotification,
  listUserNotifications,
  markUserNotificationAsRead,
  NotificationDetail,
  NotificationListItem,
} from '@/lib/api';
import { useAuth } from '@/context/auth-context';

interface NotificationsContextValue {
  notifications: NotificationListItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  getNotificationDetail: (notificationId: number) => Promise<NotificationDetail>;
  markAsRead: (notificationId: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationsRef = useRef<NotificationListItem[]>([]);

  const token = session?.token;
  const userId = session?.userId;

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    if (!token || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await listUserNotifications(userId, token);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'No pudimos cargar tus mensajes.');
    } finally {
      setIsLoading(false);
    }
  }, [token, userId]);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!token || !userId) {
      return;
    }

    const wasUnread = notificationsRef.current.some((item) => item.id === notificationId && !item.read);

    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => (wasUnread ? Math.max(0, prev - 1) : prev));

    try {
      await markUserNotificationAsRead(userId, notificationId, token);
    } catch (markError) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: false } : item))
      );
      setUnreadCount((prev) => (wasUnread ? prev + 1 : prev));
      throw markError;
    }
  }, [token, userId]);

  const getNotificationDetail = useCallback(async (notificationId: number) => {
    if (!token || !userId) {
      throw new Error('Tu sesion vencio. Inicia sesion nuevamente.');
    }

    const detail = await getUserNotification(userId, notificationId, token);

    setNotifications((prev) => {
      const existing = prev.some((item) => item.id === notificationId);
      return existing ? prev.map((item) => (item.id === notificationId ? detail : item)) : [detail, ...prev];
    });

    return detail;
  }, [token, userId]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      refreshNotifications,
      getNotificationDetail,
      markAsRead,
    }),
    [notifications, unreadCount, isLoading, error, refreshNotifications, getNotificationDetail, markAsRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  }

  return context;
}
