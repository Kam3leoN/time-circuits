/** Bruitages et musique du projet d'origine (fichiers dans public/audios). */
const BASE = `${import.meta.env.BASE_URL}audios/`;

export const SOUNDS = {
  dial1: 'bttf-dial-1.mp3', dial2: 'bttf-dial-2.mp3', dial3: 'bttf-dial-3.mp3',
  button: 'bttf-input-button.mp3', error: 'bttf-input-error.mp3', success: 'bttf-input-success.mp3',
  on: 'bttf-time-circuits-on.mp3', off: 'bttf-time-circuits-off.mp3',
  powerup: 'power-up.mp3', zap: 'zap.mp3', buzz: 'buzz.mp3',
  nomdezeus: 'nomdezeus2.mp3',
} as const;
export type SoundName = keyof typeof SOUNDS;

/** Durée de secours si les métadonnées MP3 ne sont pas encore lues (StormBTTF ≈ 3,4 s). */
const STORM_FALLBACK_MS = 3400;
/** Fondu musique pendant l'orage : court, terminé avant / avec la fin de StormBTTF. */
const MUSIC_FADE_MS = 900;

export class AudioManager {
  muted = false;
  musicEnabled = true;
  readonly #music = new Audio(`${BASE}bttf.mp3`);
  readonly #storm = new Audio(`${BASE}StormBTTF.mp3`);
  #fade: number | undefined;
  #stormMs = STORM_FALLBACK_MS;

  constructor() {
    this.#music.loop = true;
    this.#music.preload = 'none';
    this.#storm.preload = 'auto';
    this.#storm.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(this.#storm.duration) && this.#storm.duration > 0) {
        this.#stormMs = Math.round(this.#storm.duration * 1000);
      }
    });
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
    this.#storm.muted = muted;
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

  /**
   * Orage des éclairs : joue StormBTTF et fait disparaître la musique de fond en fondu rapide.
   * @returns durée du son d'orage (ms) pour caler l'overlay éclairs.
   */
  playStorm(): number {
    window.clearInterval(this.#fade);
    if (!this.muted) {
      this.#storm.pause();
      this.#storm.currentTime = 0;
      this.#storm.volume = 0.9;
      this.#storm.play().catch(() => {});
    }
    this.#fadeMusicOut(MUSIC_FADE_MS);
    return this.#stormMs;
  }

  #fadeMusicOut(ms: number): void {
    const a = this.#music;
    if (a.paused) return;
    window.clearInterval(this.#fade);
    const steps = Math.max(1, Math.round(ms / 50));
    const delta = a.volume / steps;
    this.#fade = window.setInterval(() => {
      a.volume = Math.max(0, a.volume - delta);
      if (a.volume <= 0.01) { window.clearInterval(this.#fade); a.pause(); a.volume = 0; }
    }, 50);
  }
}

/** Petite vibration au toucher (smartphone), si disponible. */
export const haptic = (ms = 8): void => { try { navigator.vibrate?.(ms); } catch { /* non pris en charge */ } };
