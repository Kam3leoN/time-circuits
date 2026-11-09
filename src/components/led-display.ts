/**
 * <led-display> — afficheur LED 7 ou 16 segments.
 *
 * Attributs : digit (2) · color red|green|amber|#hex (#ffffff) · segment 7|16 (7) · label ("label", "" = masqué)
 *   · label-rotate 0|random|angle (0) · label-color · ghost (true) · italic (true, 16 seg) · value · pad · power (on)
 * CSS : --led-size (5.829em), --led-label-size, --led-font-7/16/label, ::part(wrapper|label|lcd|cell)
 */
import css from './led-display.scss?inline';
import { buildPalette, define, DEFAULT_COLOR, isFalse, ribbonColor, SLANT } from './palette';

/** Caractère « tous segments allumés » de la police 16Segments. */
const SEG16_ALL = '⌓';

const randomAngle = () => Math.round((Math.random() * 6 - 3) * 10) / 10; // −3° … +3°

export class LedDisplay extends HTMLElement {
  static readonly observedAttributes = ['digit', 'color', 'segment', 'label', 'ghost', 'value', 'pad', 'power', 'label-color', 'italic', 'label-rotate'];

  readonly #wrap: HTMLElement;
  readonly #label: HTMLElement;
  readonly #lcd: HTMLElement;
  #random = randomAngle();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>
      <div class="wrap" part="wrapper">
        <div class="label" part="label"></div>
        <div class="lcd" part="lcd" role="img"></div>
      </div>`;
    this.#wrap = root.querySelector('.wrap')!;
    this.#label = root.querySelector('.label')!;
    this.#lcd = root.querySelector('.lcd')!;
  }

  connectedCallback(): void { this.#render(); }
  attributeChangedCallback(): void { if (this.isConnected) this.#render(); }

  get digit(): number { const n = parseInt(this.getAttribute('digit') ?? '', 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 64) : 2; }
  set digit(v: number) { this.setAttribute('digit', String(v)); }
  get color(): string { return this.getAttribute('color') || DEFAULT_COLOR; }
  set color(v: string) { this.setAttribute('color', v); }
  get segment(): 7 | 16 { return this.getAttribute('segment')?.trim() === '16' ? 16 : 7; }
  set segment(v: 7 | 16) { this.setAttribute('segment', String(v)); }
  get label(): string { return this.hasAttribute('label') ? this.getAttribute('label') ?? '' : 'label'; }
  set label(v: string) { this.setAttribute('label', v); }
  get ghost(): boolean { return !isFalse(this.getAttribute('ghost')); }
  set ghost(v: boolean) { this.setAttribute('ghost', String(v)); }
  get italic(): boolean { return !isFalse(this.getAttribute('italic')); }
  set italic(v: boolean) { this.setAttribute('italic', String(v)); }
  get value(): string { return this.getAttribute('value') ?? ''; }
  set value(v: string) { this.setAttribute('value', v); }
  get pad(): string { const p = this.getAttribute('pad'); return p ? p[0] : this.segment === 16 ? ' ' : '0'; }
  set pad(v: string) { this.setAttribute('pad', v); }
  get power(): boolean { return !isFalse(this.getAttribute('power')); }
  set power(v: boolean) { this.setAttribute('power', v ? 'on' : 'off'); }

  /** Angle effectivement appliqué au ruban (degrés). */
  get labelRotation(): number {
    const v = (this.getAttribute('label-rotate') ?? '0').trim().toLowerCase();
    if (v === 'random') return this.#random;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  /** Nouveau tirage aléatoire (mode random). */
  rerollLabel(): number { this.#random = randomAngle(); if (this.isConnected) this.#render(); return this.labelRotation; }

  #render(): void {
    const n = this.digit;
    const seg = this.segment;
    const p = buildPalette(this.color);
    const s = this.#wrap.style;
    s.setProperty('--_main', p.main);
    s.setProperty('--_glow1', p.glow[0]);
    s.setProperty('--_glow2', p.glow[1]);
    s.setProperty('--_bg', p.bg);
    s.setProperty('--_ghost', p.ghost);
    s.setProperty('--_edge', p.edge);
    s.setProperty('--_rot', `${this.labelRotation}deg`);
    s.setProperty('--_ribbon', ribbonColor(this.getAttribute('label-color'), p.ribbon));
    // Normalisation d'après les métriques des polices (segments = 0,70 × --led-size) :
    //  AlarmClock : 0,512 × 0,700 em, calés à gauche et en bas → recentrage ;
    //  16Segments : 0,540 × 0,884 em → réduits à 79,2 %, droits → inclinés comme AlarmClock.
    s.setProperty('--_font', seg === 16 ? 'var(--led-font-16, "16Segments", monospace)' : 'var(--led-font-7, AlarmClock, monospace)');
    s.setProperty('--_fs', seg === 16 ? '.792em' : '1em');
    s.setProperty('--_shift', seg === 16 ? `translateY(-.009em)${this.italic ? ` skewX(-${SLANT}deg)` : ''}` : 'translate(.0373em,.016em)');
    s.setProperty('--_gk', seg === 16 ? '1.2626' : '1');

    this.dataset.ghost = this.ghost ? 'on' : 'off';
    this.dataset.power = this.power ? 'on' : 'off';

    const label = this.label;
    this.#label.textContent = label;
    this.#label.hidden = label.trim() === '';

    const text = this.value.slice(0, n).padStart(n, this.pad);
    this.#lcd.setAttribute('aria-label', `${label ? `${label} : ` : ''}${text.trim()}`);

    const frag = document.createDocumentFragment();
    for (const ch of text) {
      const cell = document.createElement('span');
      cell.className = 'cell';
      cell.setAttribute('part', 'cell');
      cell.setAttribute('aria-hidden', 'true');
      cell.append(span('ghost', seg === 16 ? SEG16_ALL : '8'), span('main', ch));
      frag.append(cell);
    }
    this.#lcd.replaceChildren(frag);
  }
}

function span(cls: string, txt: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = txt;
  return el;
}

define('led-display', LedDisplay);

declare global { interface HTMLElementTagNameMap { 'led-display': LedDisplay } }
