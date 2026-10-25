import Pdf from 'react-native-pdf';

import type { PdfViewerProps } from '@/components/pdf-viewer.types';

// In-app PDF preview (Android and iOS). `react-native-pdf` only exists natively, so it is imported here and nowhere
// else: the web bundle that Expo Router builds for every release uses pdf-viewer.web.tsx instead.
export function PdfViewer({ uri, style, onLoadComplete, onPageChanged, onError }: PdfViewerProps) {
  return (
    <Pdf
      source={{ uri, cache: false }}
      horizontal
      enablePaging
      trustAllCerts={false}
      style={style}
      onLoadComplete={(pages) => onLoadComplete?.(pages)}
      onPageChanged={(page) => onPageChanged?.(page)}
      onError={() => onError?.()}
    />
  );
}
