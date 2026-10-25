import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { subscribeToast } from '@/lib/toast';

const SHOW_MS = 2800;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 100, alignItems: 'center' }}>
      <View style={{ backgroundColor: Brand.navy, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, maxWidth: 340 }}>
        <ThemedText style={{ color: '#FFFFFF' }}>{message}</ThemedText>
      </View>
    </View>
  );
}
