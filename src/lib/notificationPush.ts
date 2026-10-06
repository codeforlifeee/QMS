/**
 * Browser-side bridge from in-app notifications to OS notifications.
 *
 * Workflow:
 *   1. On first load, register `/sw.js` as a service worker.
 *   2. On first user gesture, call `requestPushPermission()` which prompts
 *      the OS. The browser remembers the answer, so this is idempotent.
 *   3. The NotificationCenter polls `/api/notifications/unread-count` every
 *      30s. When it detects a new unread notification, call
 *      `showPushNotification(title, body, url)` to display an OS banner.
 *
 * We intentionally do NOT run a server-push subscription (no VAPID keys),
 * so banners only appear while the browser tab is open. This keeps the
 * implementation deploy-free and still satisfies the "browser notifications"
 * requirement of the plan.
 */

const PERM_KEY = 'qms-push-permission-asked';

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
  } catch {
    /* silent — service worker is optional */
  }
}

export function hasPushPermission(): boolean {
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  const perm = await Notification.requestPermission();
  try { localStorage.setItem(PERM_KEY, '1'); } catch {}
  return perm;
}

export function hasAskedForPermission(): boolean {
  try { return localStorage.getItem(PERM_KEY) === '1'; } catch { return false; }
}

export async function showPushNotification(title: string, body: string, url = '/'): Promise<void> {
  if (!hasPushPermission()) return;
  if (!swRegistration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    swRegistration = await navigator.serviceWorker.ready.catch(() => null);
  }
  const opts: NotificationOptions = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url },
    tag: `qms-${url}`,
  };
  if (swRegistration) {
    await swRegistration.showNotification(title, opts).catch(() => { new Notification(title, opts); });
  } else {
    new Notification(title, opts);
  }
}
