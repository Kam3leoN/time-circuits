/** Contrôleur principal : power, voyage, reset, son, thème, raccourcis clavier, langue. */
import type { SetTo88, TimeCircuit } from '../components';
import { AudioManager, haptic } from './audio';
import { readDigits } from './digits';
import { applyStatic, dict, setLang, t, tErr } from './i18n';
import { Keypad, type Mode } from './keypad';
import { lightning } from './lightning';
import { SettingsPanel } from './settings';
import { loadSettings, saveSettings, type Settings } from './storage';
import { $, hideToast, toast } from './ui';

const DEFAULTS = {
  destination: { month: 11, day: '12', year: '1955', hour: '06', minute: '39', second: '00', isAM: true },
  departed: { month: 10, day: '26', year: '1985', hour: '01', minute: '21', second: '00', isAM: true },
};

export class App {
  readonly s: Settings = loadSettings();
  readonly audio = new AudioManager();
  readonly panel = $('tc');
  readonly dest = $<TimeCircuit>('tcDest');
  readonly present = $<TimeCircuit>('tcPresent');
  readonly departed = $<TimeCircuit>('tcDeparted');
  readonly speed = $<SetTo88>('tcSpeed');
  readonly preview = $<TimeCircuit>('kpPreview');
  readonly keypad: Keypad;
  readonly settings: SettingsPanel;

  power = false;
  travelling = false;
  resetCount = 0;
  buffer = '';

  constructor() {
    const circuits: Record<Mode, TimeCircuit> = { destination: this.dest, present: this.present, departed: this.departed };
    this.keypad = new Keypad(circuits, this.audio, (m, d) => this.applyDigits(m, d), () => this.setActive('bDate', false));
    this.settings = new SettingsPanel(this.s, (k) => this.onSetting(k), () => this.setActive('bOptions', false));

    this.dest.update(DEFAULTS.destination);
    this.departed.update(DEFAULTS.departed);
    this.present.live = true;
    this.setPower(false, false);

    this.bind('bDate', () => this.openKeypad());
    this.bind('bPower', () => this.setPower(!this.power));
    this.bind('bTravel', () => void this.travel());
    this.bind('bReset', () => this.reset());
    this.bind('bMute', () => this.toggleMute());
    this.bind('bTheme', () => this.toggleTheme());
    this.bind('bFullscreen', () => { void this.settings.toggleFullscreen(); this.audio.play('button'); });
    this.bind('bOptions', () => { this.setActive('bOptions', true); this.settings.sync(); this.settings.modal.show(); this.audio.play('button'); });
    if (!document.fullscreenEnabled) $('bFullscreen').hidden = true;
    document.addEventListener('keydown', (e) => this.onKey(e));

    this.audio.setMuted(this.s.muted);
    this.audio.musicEnabled = this.s.music;
    this.applyAll();
    this.settings.sync();
    window.setTimeout(() => { if (!this.power) toast(t('hello'), 3200); }, 900);
  }

  /* ----- réglages ----- */
  applyAll(): void {
    const s = this.s;
    setLang(s.lang);
    const all = [this.dest, this.present, this.departed, this.preview];
    for (const c of all) {
      c.lang = s.lang;
      c.format = s.format;
      c.toggleAttribute('seconds', s.seconds);
      c.setAttribute('labels', t('tcLabels'));
      c.setAttribute('ampm-labels', t('ampm'));
    }
    for (const c of [this.dest, this.present, this.departed]) {
      if (s.frame === 'off') c.removeAttribute('frame'); else c.setAttribute('frame', s.frame === 'granite' ? 'granite' : '');
      c.setAttribute('label-rotate', s.rotate);
    }
    this.speed.setAttribute('label-rotate', s.rotate);
    this.dest.label = t('fDest'); this.present.label = t('fPres'); this.departed.label = t('fDep');
    if (!this.travelling) this.speed.reset();
    this.speed.target = dict().speedTarget;
    this.speed.setAttribute('labels', t('speedLabels'));
    this.speed.setAttribute('unit', t('speedUnit'));
    this.speed.title = t('speedTitle');

    const p = this.panel.dataset;
    p.fmt = String(s.format); p.sec = s.seconds ? 'on' : 'off'; p.frame = s.frame; p.themePanel = s.theme;
    this.#icons();
    applyStatic();
    this.keypad.relabel();
    document.title = t('appTitle');
  }

  onSetting(key: keyof Settings): void {
    if (key === 'music') { this.audio.musicEnabled = this.s.music; if (!this.s.music) this.audio.stopMusic(); }
    this.applyAll();
    this.audio.play('button');
  }

  /* ----- boutons ----- */
  bind(id: string, fn: () => void): void {
    $(id).querySelector('button')!.addEventListener('click', () => { haptic(); fn(); });
  }
  setActive(id: string, on: boolean): void { $(id).classList.toggle('active', on); }

  showError(code = ''): void { $('tcError').textContent = code ? tErr(code) : ''; }

  requirePower(): boolean {
    if (this.power) return true;
    this.showError('* POWER * OFF');
    this.audio.play('error');
    toast(t('needPower'));
    $('bPower').animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 220 });
    return false;
  }

  setPower(on: boolean, sound = true): void {
    this.power = on;
    if (sound) this.audio.play(on ? 'on' : 'off');
    // PRESENT TIME reste allumé, comme dans le projet d'origine.
    this.dest.power = this.departed.power = this.speed.power = on;
    this.setActive('bPower', on);
    this.panel.dataset.power = on ? 'on' : 'off';
    if (on) hideToast();
    if (!on) {
      this.buffer = '';
      this.speed.cancel();
      this.audio.stopMusic();
      if (this.keypad.isOpen) this.keypad.modal.close();
    } else this.showError();
  }

  openKeypad(): void {
    if (!this.requirePower()) return;
    this.setActive('bDate', true);
    this.keypad.open();
  }

  applyDigits(mode: Mode, digits: string): boolean {
    const c = { destination: this.dest, present: this.present, departed: this.departed }[mode];
    const { patch, error } = readDigits(digits, c, mode === 'destination');
    if (error || !digits) { this.showError(error ?? '* EMPTY * INPUT'); this.audio.play('error'); return false; }
    if (mode === 'present') c.live = false; // sinon l'horloge écraserait la saisie
    c.update(patch);
    this.showError();
    this.audio.play('success');
    return true;
  }

  async travel(): Promise<void> {
    if (this.travelling || !this.requirePower()) return;
    const d = this.dest.getDateTime();
    if (![d.month, d.day, d.year, d.hour, d.minute].every((v) => v.trim())) { this.showError('* SET * DESTINATION'); this.audio.play('error'); return; }
    this.travelling = true;
    this.setActive('bTravel', true);
    this.showError();
    this.departed.update(this.present.getDateTime());
    this.present.live = false;
    this.audio.play('success');
    this.audio.play('buzz');
    this.audio.startMusic();
    const ok = await this.speed.run({ hold: 250 });
    if (ok) {
      this.audio.play('zap');
      haptic(120);
      const flash = $('tcFlash');
      flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
      void lightning($<HTMLCanvasElement>('tcBolts'));
      await new Promise((r) => setTimeout(r, 700));
      this.present.update(this.dest.getDateTime());
      const a = this.present.getDateTime();
      toast(dict().arrived(this.s.lang === 'fr' ? `${a.day} ${a.month} ${a.year}` : `${a.month} ${a.day} ${a.year}`));
    }
    this.travelling = false;
    this.setActive('bTravel', false);
  }

  reset(): void {
    if (!this.requirePower()) return;
    this.audio.play('powerup');
    if (++this.resetCount === 1) this.departed.update(this.present.getDateTime());
    else { this.resetCount = 0; this.dest.update(DEFAULTS.destination); this.departed.update(DEFAULTS.departed); }
    this.speed.reset();
    this.present.live = true;
    this.showError();
    this.setActive('bReset', true);
    setTimeout(() => this.setActive('bReset', false), 300);
  }

  toggleMute(): void {
    this.s.muted = !this.s.muted;
    this.audio.setMuted(this.s.muted);
    saveSettings(this.s);
    this.#icons();
  }

  toggleTheme(): void {
    this.s.theme = this.s.theme === 'dark' ? 'light' : 'dark';
    this.panel.dataset.themePanel = this.s.theme;
    saveSettings(this.s);
    this.#icons();
  }

  #icons(): void {
    this.setActive('bMute', this.s.muted);
    $('bMute').querySelector<HTMLElement>('.ic-on')!.hidden = this.s.muted;
    $('bMute').querySelector<HTMLElement>('.ic-off')!.hidden = !this.s.muted;
    const light = this.s.theme === 'light';
    $('bTheme').querySelector<HTMLElement>('.ic-sun')!.hidden = light;
    $('bTheme').querySelector<HTMLElement>('.ic-moon')!.hidden = !light;
  }

  /* ----- clavier physique ----- */
  onKey(e: KeyboardEvent): void {
    if (this.keypad.isOpen || this.settings.modal.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement).closest?.('input, textarea, select')) return;
    const k = e.key;
    if (k >= '0' && k <= '9') {
      if (!this.power) return;
      if (this.buffer.length < 12) { this.buffer += k; this.audio.dial(k); this.showError(this.buffer.replace(/(\d{2})(?=\d)/g, '$1 ')); }
      else this.audio.play('error');
    } else if (k === 'Enter' && this.buffer) { e.preventDefault(); this.applyDigits('destination', this.buffer); this.buffer = ''; }
    else if (k === 'Backspace' && this.buffer) { this.buffer = this.buffer.slice(0, -1); this.showError(this.buffer); this.audio.dial(1); }
    else {
      const map: Record<string, () => void> = {
        x: () => void this.travel(), d: () => this.openKeypad(), p: () => this.setPower(!this.power), r: () => this.reset(),
        m: () => this.toggleMute(), t: () => this.toggleTheme(), o: () => $('bOptions').querySelector('button')!.click(),
        f: () => void this.settings.toggleFullscreen(),
      };
      map[k.toLowerCase()]?.();
    }
  }
}
