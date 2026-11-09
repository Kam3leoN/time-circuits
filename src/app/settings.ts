/** Panneau de réglages : langue, heure, secondes, cadre, rubans, musique, plein écran, installation. */
import { saveSettings, type Settings } from './storage';
import { t } from './i18n';
import { $, Modal, toast } from './ui';

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

export class SettingsPanel {
  readonly modal: Modal;
  #installEvent: BeforeInstallPromptEvent | null = null;

  constructor(private readonly s: Settings, onChange: (key: keyof Settings) => void, onClose: () => void) {
    this.modal = new Modal($('op'), onClose);
    $('op').addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const key = input.name as keyof Settings;
      const v = input.value;
      switch (key) {
        case 'lang': s.lang = v === 'en' ? 'en' : 'fr'; s.format = s.lang === 'fr' ? 24 : 12; break; // FR → 24 h, EN → 12 h AM/PM
        case 'format': s.format = v === '24' ? 24 : 12; break;
        case 'seconds': s.seconds = v === 'on'; break;
        case 'frame': s.frame = v === 'on' || v === 'granite' ? v : 'off'; break;
        case 'rotate': s.rotate = v === 'random' ? 'random' : '0'; break;
        case 'music': s.music = v === 'on'; break;
        default: return;
      }
      saveSettings(s);
      this.sync();
      onChange(key);
    });

    // Plein écran (+ verrouillage paysage quand le navigateur le permet).
    $('btnFullscreen').addEventListener('click', () => void this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.#labelFullscreen());
    if (!document.fullscreenEnabled) $('btnFullscreen').hidden = true;

    // Installation PWA.
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.#installEvent = e as BeforeInstallPromptEvent; $('btnInstall').hidden = false; });
    window.addEventListener('appinstalled', () => { $('btnInstall').hidden = true; toast(t('installed')); });
    $('btnInstall').addEventListener('click', async () => {
      if (!this.#installEvent) return;
      await this.#installEvent.prompt();
      this.#installEvent = null;
      $('btnInstall').hidden = true;
    });
  }

  /** Coche les boutons radio selon les réglages courants. */
  sync(): void {
    const values: Record<string, string> = {
      lang: this.s.lang, format: String(this.s.format), seconds: this.s.seconds ? 'on' : 'off',
      frame: this.s.frame, rotate: this.s.rotate, music: this.s.music ? 'on' : 'off',
    };
    for (const [name, v] of Object.entries(values)) {
      const input = document.querySelector<HTMLInputElement>(`#op input[name="${name}"][value="${v}"]`);
      if (input) input.checked = true;
    }
    this.#labelFullscreen();
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await o.lock?.('landscape').catch(() => {});
      }
    } catch { /* refusé par le navigateur */ }
  }

  #labelFullscreen(): void {
    $('btnFullscreen').querySelector('span')!.textContent = document.fullscreenElement ? t('exitFullscreen') : t('fullscreen');
  }
}
