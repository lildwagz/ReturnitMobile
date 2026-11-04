import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Icon } from '@/components/icon';
import { PdfViewer } from '@/components/pdf-viewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { shareClaimPdf } from '@/lib/claim-package';

// The made PDF, full screen, so the person sees what the shop will get before sending it. Sharing stays available
// until it is closed; the file is deleted by whoever closes it (see ClaimSheet).
export function ClaimPreview({ uri, skipped, onClose }: { uri: string | null; skipped: number; onClose: () => void }) {
  return (
    <Modal visible={!!uri} animationType="slide" onRequestClose={onClose}>
      {uri && <PreviewBody key={uri} uri={uri} skipped={skipped} onClose={onClose} />}
    </Modal>
  );
}

function PreviewBody({ uri, skipped, onClose }: { uri: string; skipped: number; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [broken, setBroken] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  async function share() {
    setShareFailed(!(await shareClaimPdf(uri)));
  }

  return (
    <ThemedView accessibilityViewIsModal style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 56 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
          <Icon name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText accessibilityRole="header" style={{ flex: 1, fontWeight: '700' }}>
          {t('claim.previewTitle')}
        </ThemedText>
      </View>

      <View style={{ flex: 1, padding: Spacing.three, gap: Spacing.two }}>
        {broken ? (
          <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
            {t('claim.previewFailed')}
          </ThemedText>
        ) : (
          <>
            <PdfViewer
              uri={uri}
              style={{ flex: 1, width: '100%', backgroundColor: '#8882' }}
              onLoadComplete={setPages}
              onPageChanged={setPage}
              onError={() => setBroken(true)}
            />
            {pages > 0 && (
              <ThemedText type="small" style={{ textAlign: 'center' }}>
                {t('rs.pdfPage', { page, pages })}
              </ThemedText>
            )}
          </>
        )}
        {skipped > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('claim.skippedBig', { n: skipped })}
          </ThemedText>
        )}
        {shareFailed && (
          <ThemedText type="small" themeColor="errorText" accessibilityLiveRegion="polite">
            {t('claim.shareFailed')}
          </ThemedText>
        )}
        <AppButton title={t('claim.share')} onPress={share} />
      </View>
    </ThemedView>
  );
}
