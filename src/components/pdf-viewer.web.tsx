import type { PdfViewerProps } from '@/components/pdf-viewer.types';

// The app is not shipped for the web. This stub only keeps the web bundle (which Expo Router builds for every
// release) from importing the native-only PDF library.
export function PdfViewer({ onError }: PdfViewerProps) {
  onError?.();
  return null;
}
