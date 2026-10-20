import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { registerForPush } from '@/lib/push';
import { useSignedIn } from '@/lib/use-signed-in';

export default function TabsLayout() {
  const router = useRouter();
  const signedIn = useSignedIn();

  // After every login and at every app start, as the backend asks.
  useEffect(() => {
    if (signedIn) registerForPush();
  }, [signedIn]);

  // Tapping a reminder opens the Pengingat tab.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/reminders' as never);
    });
    return () => sub.remove();
  }, [router]);

  return <AppTabs />;
}