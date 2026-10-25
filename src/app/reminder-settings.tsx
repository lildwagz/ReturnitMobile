import { ScrollView } from 'react-native';

import { ReminderPrefs } from '@/components/reminder-prefs';
import { ThemedView } from '@/components/themed-view';
import { useSignedIn } from '@/lib/use-signed-in';

// Reminder settings on their own screen (Settings > Preferensi pengingat), so the Pengingat tab can be the history.
export default function ReminderSettingsScreen() {
  const signedIn = useSignedIn() === true;
  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <ReminderPrefs signedIn={signedIn} />
      </ScrollView>
    </ThemedView>
  );
}
