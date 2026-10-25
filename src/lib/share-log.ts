import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n';
import { APP_VERSION } from '@/lib/app-gate';
import { getLogText, logLineCount } from '@/lib/log';

// Writes the in-memory log to a temporary text file and opens the share sheet. Returns null when done, or a message
// for the user. The file is deleted afterwards.
export async function shareLog(): Promise<string | null> {
  if (logLineCount() === 0) return t('log.empty');
  if (!(await Sharing.isAvailableAsync())) return t('export.noSharing');
  const file = new File(Paths.cache, 'returnit-log.txt');
  try {
    if (file.exists) file.delete();
    file.create();
    file.write('ReturnIt ' + APP_VERSION + '\n' + getLogText());
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: t('log.dialogTitle') });
    return null;
  } catch {
    return t('log.cannotCreate');
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // nothing to do
    }
  }
}
