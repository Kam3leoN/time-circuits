/** Panneau de réglages : langue, heure, secondes, cadre, rubans, musique, plein écran, installation. */
import { saveSettings, type Settings } from './storage';
import { t } from './i18n';
import { $, Modal, toast } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/** True si l’app tourne déjà en mode installé (fenêtre PWA). */
function isInstalledDisplay(): boolean {
  const modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'] as const;
  return modes.some((m) => window.matchMedia(`(display-mode: ${m})`).matches)
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

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

    // Installation PWA — preventDefault garde l’événement pour notre bouton (sinon barre native Chrome seulement).
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#installEvent = e as BeforeInstallPromptEvent;
      this.#refreshInstallUi();
    });
    window.addEventListener('appinstalled', () => {
      this.#installEvent = null;
      this.#refreshInstallUi();
      toast(t('installedPin'));
    });
    $('btnInstall').addEventListener('click', () => void this.#promptInstall());
    const dockInstall = document.getElementById('bInstall');
    dockInstall?.querySelector('button')?.addEventListener('click', () => void this.#promptInstall());

    this.#refreshInstallUi();
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
    this.#refreshInstallUi();
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
    const inFs = !!document.fullscreenElement;
    $('btnFullscreen').querySelector('span')!.textContent = inFs ? t('exitFullscreen') : t('fullscreen');
    const nav = document.getElementById('bFullscreen');
    const tip = inFs ? t('exitFullscreen') : t('tFullscreen');
    const btn = nav?.querySelector('button');
    if (btn) { btn.title = tip; btn.setAttribute('aria-label', tip); }
    // Libellé court dans la barre (le texte long reste dans les réglages).
    const small = nav?.querySelector('small');
    if (small) small.textContent = t('bFullscreen');
  }

  async #promptInstall(): Promise<void> {
    if (!this.#installEvent) {
      toast(t('installManual'), 5200);
      return;
    }
    try {
      await this.#installEvent.prompt();
      await this.#installEvent.userChoice;
    } catch { /* annulé */ }
    this.#installEvent = null;
    this.#refreshInstallUi();
  }

  #refreshInstallUi(): void {
    const installed = isInstalledDisplay();
    const canPrompt = !!this.#installEvent;
    const btn = $('btnInstall');
    const tip = document.getElementById('installTip');
    const dock = document.getElementById('bInstall');

    if (installed) {
      btn.hidden = true;
      if (tip) { tip.hidden = true; tip.textContent = ''; }
      if (dock) dock.hidden = true;
      return;
    }

    // Bouton réglages toujours visible hors mode installé (prompt natif ou aide manuelle).
    btn.hidden = false;
    btn.querySelector('span')!.textContent = t('install');
    if (tip) {
      tip.hidden = false;
      tip.textContent = canPrompt ? t('installReady') : t('installManual');
    }
    if (dock) {
      dock.hidden = !canPrompt;
      const dockBtn = dock.querySelector('button');
      const label = t('tInstall');
      if (dockBtn) { dockBtn.title = label; dockBtn.setAttribute('aria-label', label); }
      const small = dock.querySelector('small');
      if (small) small.textContent = t('bInstall');
    }
  }
}
