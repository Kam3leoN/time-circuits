/** Réglages gardés dans ce navigateur (localStorage protégé : l'app marche aussi sans). */
import type { Lang } from '../components';

export type FrameMode = 'off' | 'on' | 'granite';
export interface Settings {
  lang: Lang;
  format: 12 | 24;
  seconds: boolean;
  frame: FrameMode;
  rotate: '0' | 'random';
  theme: 'dark' | 'light';
  muted: boolean;
  music: boolean;
}

const KEY = 'time-circuits:settings';

export function defaultSettings(): Settings {
  const lang: Lang = /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
  return { lang, format: lang === 'fr' ? 24 : 12, seconds: false, frame: 'off', rotate: 'random', theme: 'dark', muted: false, music: true };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...base, ...(JSON.parse(raw) as Partial<Settings>) } : base;
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible : on continue */ }
}
