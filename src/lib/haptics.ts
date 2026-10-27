import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Light haptic feedback for the two moments that deserve it: a successful save and a
// confirmed delete. Never throws, does nothing on the web build; the phone's own
// vibration settings decide whether it is felt, so there is no in-app setting.

/** Success tick: after a purchase was saved (created or updated). */
export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    // no haptics on this device: fine
  }
}

/** Warning buzz: at the moment a deletion is confirmed, before the request starts. */
export function hapticWarning() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {
    // no haptics on this device: fine
  }
}
