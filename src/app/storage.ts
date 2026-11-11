/** Réglages gardés dans ce navigateur (localStorage protégé : l'app marche aussi sans). */
import type { Lang } from '../components';

export type FrameMode = 'off' | 'on' | 'granite';

/** Identifiants des blocs flottants (flux / gauges / reset / set-to). */
export const FLOAT_IDS = ['capacitor', 'power', 'chamber', 'reset', 'speed'] as const;
export type FloatId = (typeof FLOAT_IDS)[number];

/** Position en % du panneau (0–100), coin haut-gauche de l’item. */
export interface FloatPos { x: number; y: number }
export type FloatMap = Record<FloatId, FloatPos>;

export interface Settings {
  lang: Lang;
  format: 12 | 24;
  seconds: boolean;
  frame: FrameMode;
  rotate: '0' | 'random';
  theme: 'dark' | 'light';
  muted: boolean;
  music: boolean;
  /** Positions des instruments flottants (JSON localStorage). */
  floats: FloatMap;
}

const KEY = 'time-circuits:settings';

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** Disposition d’usine autour des 3 modules centrés. */
export function defaultFloats(): FloatMap {
  return {
    capacitor: { x: 2, y: 12 },
    power: { x: 1.5, y: 48 },
    chamber: { x: 78, y: 10 },
    reset: { x: 84, y: 52 },
    speed: { x: 82, y: 74 },
  };
}

export function defaultSettings(): Settings {
  const lang: Lang = /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
  return {
    lang,
    format: lang === 'fr' ? 24 : 12,
    seconds: false,
    frame: 'off',
    rotate: 'random',
    theme: 'dark',
    muted: false,
    music: true,
    floats: defaultFloats(),
  };
}

function mergeFloats(raw: unknown): FloatMap {
  const base = defaultFloats();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<Record<string, Partial<FloatPos>>>;
  for (const id of FLOAT_IDS) {
    const p = src[id];
    if (p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      base[id] = { x: clampPct(p.x), y: clampPct(p.y) };
    }
  }
  return base;
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...base, ...parsed, floats: mergeFloats(parsed.floats) };
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ }
}
