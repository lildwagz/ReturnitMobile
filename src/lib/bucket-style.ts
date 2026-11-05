// Every bucket and every person gets a colour of their own, so a purchase, a chip and a member are recognised at a glance.
// The colours are data colours (like a chart palette), not theme colours: each one is at least 4.5:1 against white text and
// readable on both the light and the dark background, so they stay the same in both themes.
export const DATA_COLORS = ['#2563EB', '#0F766E', '#7C3AED', '#B45309', '#BE185D', '#047857'] as const;

// The personal bucket is deliberately quiet: it is not shared with anybody.
export const PERSONAL_COLOR = '#526071';

// A stable colour from an id: the same bucket or person always has the same one, on every phone.
export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DATA_COLORS[h % DATA_COLORS.length];
}

// First letter (or first symbol) of a name, upper case; "?" when there is nothing to show.
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : '?';
}
