/** Web notifications through the browser Notification API. */
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

function api(): typeof Notification | null {
  return typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;
}

function toState(p: NotificationPermission): PermissionState {
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'undetermined';
}

export async function getNotificationPermission(): Promise<PermissionState> {
  const N = api();
  return N ? toState(N.permission) : 'unsupported';
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  const N = api();
  if (!N) return 'unsupported';
  try {
    return toState(await N.requestPermission());
  } catch {
    return 'unsupported';
  }
}

export async function sendLocalNotification(title: string, body: string): Promise<boolean> {
  const N = api();
  if (!N || N.permission !== 'granted') return false;
  try {
    new N(title, { body, tag: `fordcast-${title}`, requireInteraction: false });
    return true;
  } catch {
    return false;
  }
}
