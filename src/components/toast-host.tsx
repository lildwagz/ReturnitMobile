import { AccessibilityInfo, Platform, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { subscribeToast } from '@/lib/toast';

const SHOW_MS = 2800;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const off = subscribeToast((m) => {
      setMessage(m);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), SHOW_MS);
    });
    return () => {
      off();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // iOS has no accessibilityLiveRegion: announce the toast directly there. Android keeps
  // the live region, so announcing on both would read the toast twice.
  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 100, alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          maxWidth: 340,
        }}>
        <ThemedText>{message}</ThemedText>
      </View>
    </View>
  );
}
