import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/**
 * The one icon family of the app (Feather line style). Sizes are tokens so icons stay
 * consistent: 20 fits beside body text, 24 stands alone (headers, icon-only controls).
 *
 * Next to a label it must be decorative (no accessibility info); on its own it must
 * carry an accessibilityLabel from the caller.
 */
export type IconSize = 20 | 24;
type FeatherProps = ComponentProps<typeof Feather>;
export type FeatherName = FeatherProps['name'];

export function Icon({
  name,
  size,
  color,
  flip,
  decorative = false,
  accessibilityLabel,
  ...rest
}: {
  name: FeatherName;
  size: IconSize;
  color?: string;
  /** Mirrors horizontally for right-to-left (directional glyphs such as chevrons). */
  flip?: boolean;
  /** Hides the icon from screen readers when it only repeats the text next to it. */
  decorative?: boolean;
  accessibilityLabel?: string;
} & FeatherProps) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityLabel={accessibilityLabel}
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
      {...rest}
    />
  );
}
