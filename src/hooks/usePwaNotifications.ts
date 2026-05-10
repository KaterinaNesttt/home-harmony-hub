import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function usePwaNotifications(enabled: boolean) {
  const lastSeenRef = useRef<string>(new Date().toISOString());

type NotificationItem = {
  id?: string;
  title: string;
  body: string;
  link?: string;
};

export function usePwaNotifications(authenticated: boolean) {
  const lastCheckedRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const ensurePermission = async () => {
      if (Notification.permission === 'default') {
        return Notification.requestPermission();
      }
      return Notification.permission;
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

    ensurePermission().then((permission) => {
      if (permission !== 'granted') return;
      pullNotifications();
      timer = window.setInterval(pullNotifications, 25_000);
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [authenticated]);
}
