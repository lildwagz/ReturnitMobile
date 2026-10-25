import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';

// Show reminders as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function getPushPermission(): Promise<{ status: PushPermission; canAskAgain: boolean }> {
  const p = await Notifications.getPermissionsAsync();
  return { status: p.status as PushPermission, canAskAgain: p.canAskAgain };
}

// Asks for permission if needed, gets the phone's token and registers it.
// Returns 'granted' when registered, otherwise the reason it was not.
export async function registerForPush(): Promise<PushPermission | 'error'> {
  if (Platform.OS !== 'android') return 'error';
  try {
    // The channel must exist before the permission prompt on Android 13+.
    await Notifications.setNotificationChannelAsync('reminders', {
      name: t('push.channel'),
      importance: Notifications.AndroidImportance.HIGH,
    });
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return perm.status as PushPermission;

    const token = String((await Notifications.getDevicePushTokenAsync()).data);
    const res = await apiFetch('/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'android', pushToken: token }),
    });
    if (!res.ok) return 'error';
    const device = await res.json();
    await SecureStore.setItemAsync('rt_device_id', device.id);
    return 'granted';
  } catch {
    return 'error';
  }
}