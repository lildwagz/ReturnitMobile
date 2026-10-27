import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { useTheme } from '@/hooks/use-theme';

/**
 * A grey placeholder with the same shape as the content that loads into it. Pulses its
 * opacity unless the phone asks for reduced motion, then stays calm.
 * On web with reduce motion there is no query, so the animation stays off there.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const [still, setStill] = useState(Platform.OS === 'web');
  const opacity = useMemo(() => new Animated.Value(0.35), []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => active && setStill(v))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.35, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ backgroundColor: theme.backgroundSelected, borderRadius: 12 }, style, { opacity: still ? 0.35 : opacity }]}
    />
  );
}

/** A tile-shaped skeleton (same radius as a Tile) for a bento grid. */
export function SkeletonTile({ height = 96, radius = 20, style }: { height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton style={[{ height, borderRadius: radius }, style]} />;
}
