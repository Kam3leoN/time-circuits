/** Contrôleur principal : power, voyage, reset, son, thème, raccourcis clavier, langue. */
import type { CapacitorOutput, FluxReset, NeedleGauge, PlutoniumChamber, SetTo88, TimeCircuit } from '../components';
import { AudioManager, haptic } from './audio';
import { readDigits } from './digits';
import { FloatLayout } from './float-layout';
import { applyStatic, dict, setLang, t } from './i18n';
import { Keypad, type Mode } from './keypad';
import { preloadWarp, warp } from './warp';
import { SettingsPanel } from './settings';
import { loadSettings, saveSettings, type Settings } from './storage';
import { $, $maybe, toast } from './ui';

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
  /** Optionnels : un vieux cache PWA sans ces nœuds ne doit pas bloquer les time circuits. */
  readonly gPower = $maybe<NeedleGauge>('gPower');
  readonly gCapacitor = $maybe<CapacitorOutput>('gCapacitor');
  readonly gChamber = $maybe<PlutoniumChamber>('gChamber');
  readonly gReset = $maybe<FluxReset>('gReset');
  readonly floats: FloatLayout | null;
  readonly keypad: Keypad;
  readonly settings: SettingsPanel;

  power = false;
  travelling = false;
  resetCount = 0;
  buffer = '';
  /** Niveau plutonium 0–1 (pilote chambre, capacitor, aiguilles). */
  fluxLevel = 0;

  constructor() {
    const circuits: Record<Mode, TimeCircuit> = { destination: this.dest, present: this.present, departed: this.departed };
    this.keypad = new Keypad(circuits, this.audio, (m, d) => this.applyDigits(m, d), () => this.setActive('bDate', false));
    this.settings = new SettingsPanel(this.s, (k) => this.onSetting(k), () => this.setActive('bOptions', false), () => this.resetFloats());

    const layer = document.getElementById('tcFloats');
    this.floats = layer ? new FloatLayout(layer, this.s) : null;

    preloadWarp();
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
    this.gReset?.addEventListener('press', () => this.reset());
    if (!document.fullscreenEnabled) $('bFullscreen').hidden = true;
    document.addEventListener('keydown', (e) => this.onKey(e));

    this.audio.setMuted(this.s.muted);
    this.audio.musicEnabled = this.s.music;
    this.applyAll();
    this.settings.sync();
  }

  resetFloats(): void {
    this.floats?.reset();
    this.audio.play('button');
    toast(t('floatsReset'));
  }

  /** Propage le niveau flux vers les instruments (no-op si absents du DOM). */
  setFlux(level: number, backlight?: boolean): void {
    this.fluxLevel = Math.max(0, Math.min(1, level));
    const v = this.fluxLevel;
    const lit = backlight ?? this.power;
    if (this.gPower) { this.gPower.value = 0.95 * v; this.gPower.backlight = lit; }
    if (this.gCapacitor) this.gCapacitor.value = v;
    if (this.gChamber) this.gChamber.value = v;
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

    this.#applyInstrumentLabels();

    const p = this.panel.dataset;
    p.fmt = String(s.format); p.sec = s.seconds ? 'on' : 'off'; p.frame = s.frame; p.themePanel = s.theme;
    this.#icons();
    applyStatic();
    this.keypad.relabel();
    document.title = t('appTitle');
  }

  /** Libellés i18n des instruments flottants. */
  #applyInstrumentLabels(): void {
    const pct = t('gPercent');
    const pwr = t('gPower');
    const strip = (text: string, dy: number, minW: number) =>
      `${text}|${dy}|${Math.max(minW, text.length * 11)}`;
    this.gPower?.setAttribute('strips', `${strip(pct, -13, 100)};${strip(pwr, 7, 78)}`);
    this.gChamber?.setAttribute('label-empty', t('gEmpty'));
    this.gChamber?.setAttribute('label-unit', t('gRoentgens'));
    this.gChamber?.setAttribute('label-title', t('gChamber'));
    this.gReset?.setAttribute('label', t('gReset'));
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

  requirePower(): boolean {
    if (this.power) return true;
    this.audio.play('error');
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
    document.body.dataset.power = this.panel.dataset.power;
    this.setFlux(on ? 1 : 0, on);
    if (!on) {
      this.buffer = '';
      this.speed.cancel();
      this.audio.stopMusic();
      if (this.keypad.isOpen) this.keypad.modal.close();
    }
  }

  openKeypad(): void {
    if (!this.requirePower()) return;
    this.setActive('bDate', true);
    this.keypad.open();
  }

  applyDigits(mode: Mode, digits: string): boolean {
    const c = { destination: this.dest, present: this.present, departed: this.departed }[mode];
    const { patch, error } = readDigits(digits, c, mode === 'destination');
    if (error || !digits) { this.audio.play('error'); return false; }
    if (mode === 'present') c.live = false; // sinon l'horloge écraserait la saisie
    c.update(patch);
    this.audio.play('success');
    return true;
  }

  async travel(): Promise<void> {
    if (this.travelling || !this.requirePower()) return;
    if (this.fluxLevel <= 0.03) { this.audio.play('error'); return; }
    const d = this.dest.getDateTime();
    if (![d.month, d.day, d.year, d.hour, d.minute].every((v) => v.trim())) { this.audio.play('error'); return; }
    this.travelling = true;
    this.setActive('bTravel', true);
    this.departed.update(this.present.getDateTime());
    this.present.live = false;
    this.audio.play('success');
    this.audio.play('buzz');
    this.audio.startMusic();
    // Le voyage consomme la chambre à plutonium.
    this.setFlux(0);
    const ok = await this.speed.run({ hold: 250 });
    if (ok) {
      this.audio.play('zap');
      haptic(120);
      // Écran noir + éclairs + StormBTTF ; musique de fond en fondu rapide jusqu'à la fin de l'orage.
      const stormMs = this.audio.playStorm();
      const w = warp(stormMs);
      await new Promise((r) => setTimeout(r, 900));
      this.present.update(this.dest.getDateTime());
      await w;
      // Juste après les éclairs / fondu musique : punchline « nom de Zeus ».
      this.audio.play('nomdezeus', 0.9);
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
    this.setFlux(1, true);
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
      if (this.buffer.length < 12) { this.buffer += k; this.audio.dial(k); }
      else this.audio.play('error');
    } else if (k === 'Enter' && this.buffer) { e.preventDefault(); this.applyDigits('destination', this.buffer); this.buffer = ''; }
    else if (k === 'Backspace' && this.buffer) { this.buffer = this.buffer.slice(0, -1); this.audio.dial(1); }
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
