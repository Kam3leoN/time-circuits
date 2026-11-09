/** Bruitages et musique du projet d'origine (fichiers dans public/audios). */
const BASE = `${import.meta.env.BASE_URL}audios/`;

export const SOUNDS = {
  dial1: 'bttf-dial-1.mp3', dial2: 'bttf-dial-2.mp3', dial3: 'bttf-dial-3.mp3',
  button: 'bttf-input-button.mp3', error: 'bttf-input-error.mp3', success: 'bttf-input-success.mp3',
  on: 'bttf-time-circuits-on.mp3', off: 'bttf-time-circuits-off.mp3',
  powerup: 'power-up.mp3', zap: 'zap.mp3', buzz: 'buzz.mp3',
} as const;
export type SoundName = keyof typeof SOUNDS;

export class AudioManager {
  muted = false;
  musicEnabled = true;
  readonly #music = new Audio(`${BASE}bttf.mp3`);
  #fade: number | undefined;

  constructor() {
    this.#music.loop = true;
    this.#music.preload = 'none';
    // Préchargement léger des bruitages (le service worker les garde ensuite hors ligne).
    for (const f of Object.values(SOUNDS)) { const a = new Audio(); a.preload = 'auto'; a.src = BASE + f; }
  }

  play(name: SoundName, volume = 0.6): void {
    if (this.muted) return;
    const a = new Audio(BASE + SOUNDS[name]);
    a.volume = volume;
    a.play().catch(() => { /* lecture refusée avant une interaction : sans gravité */ });
  }

  dial(key: string | number): void {
    const n = Number(key);
    this.play([1, 4, 7].includes(n) ? 'dial1' : [2, 5, 8, 0].includes(n) ? 'dial2' : 'dial3');
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.#music.muted = muted;
  }

  startMusic(): void {
    if (!this.musicEnabled || this.muted) return;
    window.clearInterval(this.#fade);
    this.#music.currentTime = 0;
    this.#music.volume = 0.5;
    this.#music.play().catch(() => {});
  }

  stopMusic(): void {
    const a = this.#music;
    if (a.paused) return;
    window.clearInterval(this.#fade);
    this.#fade = window.setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.06);
      if (a.volume <= 0.01) { window.clearInterval(this.#fade); a.pause(); }
    }, 50);
  }
}

/** Petite vibration au toucher (smartphone), si disponible. */
export const haptic = (ms = 8): void => { try { navigator.vibrate?.(ms); } catch { /* non pris en charge */ } };
