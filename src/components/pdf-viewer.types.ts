import type { StyleProp, ViewStyle } from 'react-native';

export type PdfViewerProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  onLoadComplete?: (pages: number) => void;
  onPageChanged?: (page: number) => void;
  onError?: () => void;
};
