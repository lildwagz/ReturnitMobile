import { useState } from 'react';
import { ActivityIndicator, I18nManager, Image, Linking, Pressable, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { Icon, type FeatherName } from '@/components/icon';
import { ReceiptViewer } from '@/components/receipt-viewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoftShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { connectionError, ReceiptItem } from '@/lib/purchase';
import { captureReceipt, formatSize, MAX_RECEIPTS, pickReceipt, uploadReceipt } from '@/lib/receipt';
import { useReceiptFile } from '@/lib/use-receipt-file';

type Props = {
  purchaseId: string;
  receipts: ReceiptItem[];
  onChanged: () => void;
};

// The receipts of one purchase (up to MAX_RECEIPTS): a row per file, a button to add another, and a full-screen viewer
// (ReceiptViewer) that opens when a row is tapped. Adding is refused at the limit, by the button here and by the server.
export function ReceiptSection({ purchaseId, receipts, onChanged }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<ReceiptItem | null>(null);

  const full = receipts.length >= MAX_RECEIPTS;

  // Shared by the file picker and the camera.
  async function uploadUri(uri: string) {
    setBusy(true);
    const error = await uploadReceipt(purchaseId, uri);
    setBusy(false);
    if (!error) onChanged();
    else setMessage(error === connectionError() ? t('rs.savedRetryUpload', { error }) : error);
  }

  async function choose(pick: typeof pickReceipt) {
    setAddOpen(false);
    setMessage(null);
    setCameraBlocked(false);
    const r = await pick();
    if (r.error) {
      setMessage(r.error);
      setCameraBlocked(!!r.cameraBlocked);
    } else if (r.uri) await uploadUri(r.uri);
  }

  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two, ...SoftShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <ThemedView
          type="background"
          style={{ width: 50, height: 58, borderRadius: Radius.sm, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="file-text" size={24} color={theme.textSecondary} decorative />
        </ThemedView>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: 700 }}>{t('rs.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {receipts.length ? t('rs.count', { n: receipts.length, max: MAX_RECEIPTS }) : t('rs.none')}
          </ThemedText>
        </View>
        <AppButton variant="secondary" title={receipts.length ? t('rs.addAnother') : t('rs.add')} onPress={() => setAddOpen(true)} disabled={busy || full} />
      </View>

      {receipts.map((r) => (
        <ReceiptRow key={r.id} purchaseId={purchaseId} receipt={r} onPress={() => setViewing(r)} />
      ))}

      {full && <ThemedText type="small" themeColor="textSecondary">{t('rs.limitReached', { max: MAX_RECEIPTS })}</ThemedText>}
      {cameraBlocked && <AppButton variant="secondary" title={t('rs.openSettings')} onPress={() => Linking.openSettings()} />}
      {busy && <ActivityIndicator />}
      {message && <ThemedText themeColor="errorText">{message}</ThemedText>}

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title={t('rs.addTitle')}>
        <SheetAction icon="camera" title={t('rs.takePhoto')} onPress={() => choose(captureReceipt)} />
        <SheetAction icon="file-plus" title={t('rs.pickFile')} onPress={() => choose(pickReceipt)} />
      </BottomSheet>

      <ReceiptViewer purchaseId={purchaseId} receipt={viewing} onClose={() => setViewing(null)} onChanged={onChanged} />
    </ThemedView>
  );
}

// A photo gets a small preview; a PDF (and a photo that has not loaded or cannot be shown) keeps its icon. The space is
// reserved (a fixed square), so nothing moves when the preview arrives. The row's own label names the file, so the
// picture is decorative for screen readers.
function ReceiptRow({ purchaseId, receipt, onPress }: { purchaseId: string; receipt: ReceiptItem; onPress: () => void }) {
  const theme = useTheme();
  const isPdf = receipt.contentType === 'application/pdf';
  const file = useReceiptFile(purchaseId, receipt, !isPdf);
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumb = !isPdf && !thumbFailed ? file.data : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('rs.open', { name: receipt.fileName })}
      onPress={onPress}
      android_ripple={{ color: theme.primary + '1F' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        minHeight: 56,
        padding: Spacing.two,
        borderRadius: Radius.sm,
        backgroundColor: theme.background,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ width: 48, height: 48, borderRadius: Radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundElement }}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={{ width: 48, height: 48 }}
            resizeMode="cover"
            accessible={false}
            importantForAccessibility="no"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <Icon name={isPdf ? 'file-text' : 'image'} size={24} color={theme.textSecondary} decorative />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText numberOfLines={1}>{receipt.fileName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {(isPdf ? t('rs.kindPdf') : t('rs.kindImage')) + ' · ' + formatSize(receipt.sizeBytes)}
        </ThemedText>
      </View>
      <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
    </Pressable>
  );
}

function SheetAction({ icon, title, onPress }: { icon: FeatherName; title: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{ color: theme.primary + '1F' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        minHeight: 56,
        padding: Spacing.three,
        borderRadius: Radius.sm,
        backgroundColor: theme.backgroundElement,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} size={20} color={theme.textSecondary} decorative />
      <ThemedText style={{ fontWeight: '700' }}>{title}</ThemedText>
    </Pressable>
  );
}
