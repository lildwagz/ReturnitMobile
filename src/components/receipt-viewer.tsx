import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Icon } from '@/components/icon';
import { PdfViewer } from '@/components/pdf-viewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage, ReceiptItem } from '@/lib/purchase';
import { formatSize } from '@/lib/receipt';
import { forgetReceiptFile } from '@/lib/receipt-cache';
import { fetchReceiptLink, useReceiptFile } from '@/lib/use-receipt-file';

// One receipt, full screen: the image or the PDF, with a close button and a delete button. Opened from the receipt
// list of the detail screen. The file comes from the on-phone cache when this receipt was viewed before.
export function ReceiptViewer({
  purchaseId,
  receipt,
  onClose,
  onChanged,
}: {
  purchaseId: string;
  receipt: ReceiptItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Modal visible={!!receipt} animationType="slide" onRequestClose={onClose}>
      {/* keyed by the receipt: each one that is opened starts with clean state and loads its own file */}
      {receipt && <ViewerBody key={receipt.id} purchaseId={purchaseId} receipt={receipt} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

function ViewerBody({
  purchaseId,
  receipt,
  onClose,
  onChanged,
}: {
  purchaseId: string;
  receipt: ReceiptItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [broken, setBroken] = useState(false); // the file was downloaded afresh and still cannot be shown
  const retriedFresh = useRef(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPages, setPdfPages] = useState(0);

  const isImage = receipt.contentType.startsWith('image/');
  const isPdf = receipt.contentType === 'application/pdf';

  // The local file: from the cache when this receipt was seen before (the list's small preview), otherwise downloaded.
  const file = useReceiptFile(purchaseId, receipt);
  const previewUri = file.data ?? null;
  const failed = file.isError || broken;

  // A file that cannot be shown is dropped and downloaded once more; if that one fails too, the error shows.
  function previewBroken() {
    forgetReceiptFile(purchaseId, receipt.id);
    if (retriedFresh.current) {
      setBroken(true);
      return;
    }
    retriedFresh.current = true;
    file.refetch();
  }

  function retry() {
    setBroken(false);
    setMessage(null);
    retriedFresh.current = false;
    file.refetch();
  }

  async function openPdf() {
    setBusy(true);
    setMessage(null);
    try {
      await Linking.openURL(await fetchReceiptLink(purchaseId, receipt.id));
    } catch (e) {
      setMessage(e instanceof Error && e.message ? e.message : t('rs.cannotOpen'));
    }
    setBusy(false);
  }

  function confirmRemove() {
    Alert.alert(t('rs.removeTitle'), t('rs.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('rs.remove'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await apiFetch('/purchases/' + purchaseId + '/receipts/' + receipt.id, { method: 'DELETE' });
            if (res.status === 204) {
              forgetReceiptFile(purchaseId, receipt.id);
              onChanged();
              onClose();
            } else setMessage(await errorMessage(res));
          } catch {
            setMessage(connectionError());
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
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
        <View style={{ flex: 1 }}>
          <ThemedText numberOfLines={1} style={{ fontWeight: '700' }}>
            {receipt.fileName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatSize(receipt.sizeBytes)}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rs.removeReceipt')}
          onPress={confirmRemove}
          disabled={busy}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed || busy ? 0.5 : 1 })}>
          <Icon name="trash-2" size={24} color={theme.errorText} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, flexGrow: 1 }}>
        {isImage && previewUri && !failed && (
          <Image source={{ uri: previewUri }} style={{ width: '100%', height: 520, borderRadius: Radius.sm }} resizeMode="contain" onError={previewBroken} />
        )}
        {isPdf && previewUri && !failed && (
          <View style={{ gap: Spacing.two }}>
            <PdfViewer
              uri={previewUri}
              style={{ width: '100%', height: 560, backgroundColor: '#8882' }}
              onLoadComplete={(pages) => setPdfPages(pages)}
              onPageChanged={(page) => setPdfPage(page)}
              onError={previewBroken}
            />
            {pdfPages > 0 && (
              <ThemedText type="small" style={{ textAlign: 'center' }}>
                {t('rs.pdfPage', { page: pdfPage, pages: pdfPages })}
              </ThemedText>
            )}
          </View>
        )}
        {file.isFetching && !previewUri && <ActivityIndicator />}
        {failed && (
          <View style={{ gap: Spacing.two }}>
            <ThemedText themeColor="errorText">
              {file.error instanceof Error && file.error.message ? file.error.message : isPdf ? t('rs.pdfFailed') : t('rs.previewFailed')}
            </ThemedText>
            <AppButton variant="secondary" title={t('rs.retry')} onPress={retry} />
            {isPdf && <AppButton variant="secondary" title={t('rs.pdfDownload')} onPress={openPdf} disabled={busy} />}
          </View>
        )}
        {busy && <ActivityIndicator />}
        {message && <ThemedText themeColor="errorText">{message}</ThemedText>}
      </ScrollView>
    </ThemedView>
  );
}
