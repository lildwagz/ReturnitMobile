import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import AppTabs from '@/components/app-tabs';
import { registerForPush } from '@/lib/push';
import { useSignedIn } from '@/lib/use-signed-in';

export default function TabsLayout() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  // After every login and at every app start, as the backend asks.
  useEffect(() => {
    if (signedIn) registerForPush();
  }, [signedIn]);

  // Tapping a reminder opens that item in the Pengingat tab.
  useEffect(() => {
    if (!lastResponse || !signedIn) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = lastResponse.notification.request.content.data as { notificationId?: string } | undefined;
    router.push({
      pathname: '/reminders',
      params: data?.notificationId ? { open: String(data.notificationId) } : {},
    } as never);
  }, [lastResponse, signedIn, router]);

  return <AppTabs />;
}