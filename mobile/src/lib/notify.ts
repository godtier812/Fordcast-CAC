/**
 * Native (iOS / Android) local notifications.
 * Imports only the local-notification submodules of `expo-notifications` rather than the root barrel
 * so `DevicePushTokenAutoRegistration.fx` (which throws an Error at import time on Android in Expo Go
 * in SDK 53+) is never evaluated.
 */
import { Platform } from 'react-native';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import type { NotificationPermissionsStatus } from 'expo-notifications/build/NotificationPermissions.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

try {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Notifications are optional; the in-app banner still shows alerts.
}

let channelReady = false;
async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await setNotificationChannelAsync('default', {
    name: 'Flood alerts',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    sound: 'default',
  });
  channelReady = true;
}

function toState(p: NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<PermissionState> {
  try {
    return toState(await getPermissionsAsync());
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    await ensureChannel();
    return toState(await requestPermissionsAsync());
  } catch {
    return 'unsupported';
  }
}

export async function sendLocalNotification(title: string, body: string): Promise<boolean> {
  try {
    await ensureChannel();
    await scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
