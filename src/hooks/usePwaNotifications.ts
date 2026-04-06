import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLL_INTERVAL = 30_000;

type NotificationItem = {
  id?: string;
  title: string;
  body: string;
  link?: string;
};

export function usePwaNotifications(authenticated: boolean) {
  const lastCheckedRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authenticated) {
      lastCheckedRef.current = new Date().toISOString();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;

    if (hasNotificationApi && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const showBrowserNotification = (item: NotificationItem) => {
      const notification = new Notification(item.title, {
        body: item.body,
        icon: '/icon-512.png',
        data: { url: item.link },
      });

      notification.onclick = () => {
        window.focus();
        if (item.link) {
          window.location.href = item.link;
        }
        notification.close();
      };
    };

    const poll = async () => {
      try {
        const token = localStorage.getItem('hhh_token');
        if (!token) return;

        const since = lastCheckedRef.current;
        const response = await fetch(`/api/notifications?since=${encodeURIComponent(since)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const items = (await response.json()) as NotificationItem[];
        lastCheckedRef.current = new Date().toISOString();

        for (const item of items) {
          if (hasNotificationApi && Notification.permission === 'granted') {
            showBrowserNotification(item);
          } else {
            toast(item.title, {
              description: item.body,
            });
          }
        }
      } catch {
        // Ignore transient polling failures.
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [authenticated]);
}
