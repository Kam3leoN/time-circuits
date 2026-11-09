/** Couleurs partagées par tous les composants LED. */

export interface Palette {
  main: string;
  glow: [string, string];
  bg: string;
  ghost: string;
  edge: string;
  ribbon: string;
}

/** Valeurs reprises des classes .lcd-red / .lcd-green / .lcd-amber du projet d'origine. */
const PRESETS: Record<string, Palette> = {
  red: { main: '#c62828', glow: ['#f80707', '#f80707'], bg: '#330000', ghost: 'rgba(198,40,40,.15)', edge: 'rgba(248,7,7,.15)', ribbon: '#880000' },
  green: { main: '#64dd17', glow: ['#0c7b0c', '#0c7b0c'], bg: '#002900', ghost: 'rgba(100,221,23,.07)', edge: 'rgba(12,123,12,.15)', ribbon: '#008800' },
  amber: { main: '#fb8c00', glow: ['#a86200', '#a86200'], bg: '#33290a', ghost: 'rgba(251,140,0,.1)', edge: 'rgba(168,98,0,.15)', ribbon: '#886400' },
};
PRESETS.orange = PRESETS.amber;

/** Couleurs nommées des rubans. */
export const RIBBONS: Record<string, string> = {
  red: '#880000', green: '#008800', amber: '#886400', orange: '#886400', black: '#0a0a0a', blue: '#003388',
};

export const DEFAULT_COLOR = '#ffffff';
const GHOST_ALPHA = 0.12;

/** Inclinaison de la police AlarmClock (pente mesurée sur le « 1 » : 0,155 → 8,8°). */
export const SLANT = 8.8;

type RGB = [number, number, number];

function parseHex(input: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;

/** Palette complète (fond, halo, ghost, ruban) à partir d'un preset ou d'un #hex. */
export function buildPalette(color: string | null | undefined): Palette {
  const key = String(color ?? '').trim().toLowerCase();
  if (PRESETS[key]) return PRESETS[key];
  const rgb = parseHex(key) ?? (parseHex(DEFAULT_COLOR) as RGB);
  const [h, s] = rgbToHsl(rgb);
  const neutral = s < 0.1;
  return {
    main: `rgb(${rgb.join(',')})`,
    glow: [rgba(rgb, 0.8), rgba(rgb, 0.6)],
    bg: neutral ? '#000000' : hsl(h, Math.min(s, 0.9), 0.09),
    ghost: rgba(rgb, GHOST_ALPHA),
    edge: rgba(rgb, 0.15),
    ribbon: neutral ? '#0a0a0a' : hsl(h, Math.min(s, 0.9), 0.27),
  };
}

/** Couleur de ruban : nom connu ou couleur CSS libre. */
export const ribbonColor = (value: string | null | undefined, fallback: string): string => {
  const v = String(value ?? '').trim();
  return v ? RIBBONS[v.toLowerCase()] ?? v : fallback;
};

/** "false", "0", "off", "no" → false ; absent → défaut. */
export const isFalse = (v: string | null): boolean => v != null && /^(false|0|off|no)$/i.test(v.trim());

/** Écrit des attributs seulement s'ils changent (évite des rendus inutiles). */
export function setAttrs(el: Element, attrs: Record<string, string>): void {
  for (const [k, v] of Object.entries(attrs)) if (el.getAttribute(k) !== v) el.setAttribute(k, v);
}

export const define = (tag: string, ctor: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
};
