import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { ToastAction, subscribeToast } from '@/lib/toast';

const SHOW_MS = 2800;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [action, setAction] = useState<ToastAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const off = subscribeToast((m, a) => {
      setMessage(m);
      setAction(a ?? null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), a?.ms ?? SHOW_MS);
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
    // Plain messages let touches through; one with a button must be tappable.
    <View
      pointerEvents={action ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 100, alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingVertical: action ? 2 : 14,
          paddingLeft: 18,
          paddingRight: action ? 6 : 18,
          maxWidth: 340,
        }}>
        <ThemedText style={{ flexShrink: 1 }}>{message}</ThemedText>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              setMessage(null);
              action.onPress();
            }}
            android_ripple={{ color: theme.primary + '1F' }}
            style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
            <ThemedText maxFontSizeMultiplier={1.2} style={{ color: theme.primary, fontWeight: '700' }}>
              {action.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
