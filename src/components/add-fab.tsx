import { useRouter } from 'expo-router';
import { useState } from 'react';
import { I18nManager, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { captureReceipt, type PickedReceipt } from '@/lib/receipt';
import { showToast } from '@/lib/toast';

// The floating "+" with its bottom sheet. Shared by Home and the Pembelian tab. Controlled
// use: `visible` + `onChange` to also open it from elsewhere (the empty-state button).
export function AddFab({ visible, onChange }: { visible?: boolean; onChange?: (v: boolean) => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [internal, setInternal] = useState(false);
  const open = visible ?? internal;
  const setOpen = (v: boolean) => {
    setInternal(v);
    onChange?.(v);
  };

  async function onCamera() {
    setOpen(false);
    const r: PickedReceipt = await captureReceipt();
    if (r.error) {
      showToast(r.error);
      return;
    }
    if (!r.uri) return; // the person cancelled
    router.push({
      pathname: '/purchase/new',
      params: { receiptUri: r.uri, receiptName: r.name ?? '' },
    } as never);
  }

  function onManual() {
    setOpen(false);
    router.push('/purchase/new' as never);
  }

  const rows: { icon: 'camera' | 'edit-3'; title: string; help: string; onPress: () => void }[] = [
    { icon: 'camera', title: t('add.camera'), help: t('add.cameraHelp'), onPress: onCamera },
    { icon: 'edit-3', title: t('add.manual'), help: t('add.manualHelp'), onPress: onManual },
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.add')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          {
            position: 'absolute',
            end: Spacing.three,
            bottom: Spacing.three + insets.bottom / 2,
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: Brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Brand.navy,
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 6,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Icon name="plus" size={24} color="#FFFFFF" decorative />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('add.title')}>
        {rows.map((r) => (
          <Pressable
            key={r.icon}
            accessibilityRole="button"
            accessibilityLabel={r.title}
            onPress={r.onPress}
            android_ripple={{ color: theme.primary + '1F' }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              minHeight: 56,
              padding: Spacing.three,
              borderRadius: Radius.sm,
              backgroundColor: theme.backgroundElement,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Icon name={r.icon} size={20} color={theme.textSecondary} decorative />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: '700' }}>{r.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {r.help}
              </ThemedText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}
