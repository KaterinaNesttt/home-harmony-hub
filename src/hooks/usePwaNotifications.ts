import { useEffect, useRef } from 'react';
import { cfNotifications } from '@/integrations/cloudflare/client';

async function showViaServiceWorker(title: string, options: NotificationOptions & { url: string }) {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    ...options,
    data: { url: options.url },
    badge: '/icon-192.png',
    icon: '/icon-192.png',
  });
}

export function usePwaNotifications(enabled: boolean) {
  const lastSeenRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    let active = true;
    let timer: number | null = null;

    const ensurePermission = async () => {
      if (Notification.permission === 'default') {
        return Notification.requestPermission();
      }
      return Notification.permission;
    };

    const pullNotifications = async () => {
      const { data } = await cfNotifications.list(lastSeenRef.current);
      if (!active || !data?.length) return;
      const newest = data[0]?.created_at;
      if (newest) lastSeenRef.current = newest;

      const ordered = [...data].reverse();
      for (const item of ordered) {
        await showViaServiceWorker(item.title, {
          body: item.body,
          url: item.link,
        });
      }
      await cfNotifications.markAllRead();
    };

    ensurePermission().then((permission) => {
      if (permission !== 'granted') return;
      pullNotifications();
      timer = window.setInterval(pullNotifications, 25_000);
    });

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled]);
}
