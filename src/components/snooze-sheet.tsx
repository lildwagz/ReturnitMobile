import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { Spacing } from '@/constants/theme';
import { t, type Key } from '@/i18n';

export type SnoozeChoice = 'tomorrow' | 'in_3_days' | 'next_week';

// "Remind me again": a sheet from the bottom with the delays the server says still make sense for this reminder
// (a warranty that ends tomorrow is not offered "next week").
export function SnoozeSheet({
  visible,
  choices,
  busy,
  onPick,
  onClose,
}: {
  visible: boolean;
  choices: SnoozeChoice[];
  busy: boolean;
  onPick: (choice: SnoozeChoice) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('snooze.title')}>
      <View style={{ gap: Spacing.two }}>
        {choices.map((c) => (
          <AppButton key={c} variant="secondary" title={t(('snooze.' + c) as Key)} onPress={() => onPick(c)} disabled={busy} />
        ))}
        <AppButton variant="secondary" title={t('common.cancel')} onPress={onClose} disabled={busy} />
      </View>
    </BottomSheet>
  );
}
