/**
 * <time-circuit> — une ligne complète : MONTH · DAY · YEAR · AM/PM · HOUR : MIN [: SEC] + ruban de pied.
 *   en : MMM/DD/YYYY · fr : JJ/MMM/AAAA
 *
 * Attributs : color (red) · label · value (now | ISO | MM/DD/YYYY HH:MM en, JJ/MM/AAAA fr) · live · lang en|fr
 *   · format 12|24 · seconds · months · labels · ampm-labels · label-color (red) · label-rotate · footer-color (black)
 *   · frame (""|granite) · ghost · italic · power
 * API : update(patch) · getDateTime() · date · months · lang · live · power. Événement : time-change.
 */
import './led-display';
import './led-ampm';
import './led-colon';
import css from './time-circuit.scss?inline';
import { define, isFalse, ribbonColor, setAttrs } from './palette';
import type { LedDisplay } from './led-display';
import type { LedAmPm } from './led-ampm';
import type { LedColon } from './led-colon';

export type Lang = 'en' | 'fr';

export interface DateTimeFields {
  month: string;
  day: string;
  year: string;
  hour: string;
  minute: string;
  second: string;
  isAM: boolean;
}
export type DateTimePatch = Partial<Omit<DateTimeFields, 'month'>> & { month?: string | number };

export const MONTHS_BY_LANG: Record<Lang, string[]> = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  fr: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
};
export const LABELS_BY_LANG: Record<Lang, string[]> = {
  en: ['MONTH', 'DAY', 'YEAR', 'HOUR', 'MIN', 'SEC'],
  fr: ['MOIS', 'JOUR', 'ANNÉE', 'HEURE', 'MIN', 'SEC'],
};

const two = (n: number) => String(n).padStart(2, '0');
export const normLang = (v: string | null | undefined): Lang => (String(v ?? '').toLowerCase().startsWith('fr') ? 'fr' : 'en');

/** Texture granit (SVG feTurbulence) en niveaux de gris. */
const GRANITE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='a'><feTurbulence type='fractalNoise' baseFrequency='.03' numOctaves='6' seed='7'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='discrete' tableValues='.38 .52 .66 .78 .88 .95 1'/><feFuncG type='discrete' tableValues='.38 .52 .66 .78 .88 .95 1'/><feFuncB type='discrete' tableValues='.4 .54 .68 .8 .89 .95 1'/><feFuncA type='table' tableValues='1 1'/></feComponentTransfer></filter><filter id='b'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' fill='#cfd0d2'/><rect width='100%' height='100%' filter='url(#a)' opacity='.9'/><rect width='100%' height='100%' filter='url(#b)' opacity='.3'/></svg>`;
const GRANITE = `url("data:image/svg+xml,${encodeURIComponent(GRANITE_SVG)}")`;

/** "now" | ISO | date à barres obliques (ordre selon la langue) → Date. */
export function parseValue(v: string | null, lang: Lang = 'en'): Date | null {
  const s = String(v ?? '').trim();
  if (!s || /^(now|today)$/i.test(s)) return new Date();
  let m = /^(\d{1,4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const [mo, d] = lang === 'fr' ? [+m[2], +m[1]] : [+m[1], +m[2]];
    return new Date(+m[3], mo - 1, d, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

interface Parts {
  month: LedDisplay; day: LedDisplay; year: LedDisplay; hour: LedDisplay; minute: LedDisplay; second: LedDisplay;
  ampm: LedAmPm; colon: LedColon; colon2: LedColon;
}

export class TimeCircuit extends HTMLElement {
  static readonly observedAttributes = ['color', 'label', 'value', 'live', 'lang', 'format', 'seconds', 'months', 'labels',
    'ampm-labels', 'label-color', 'label-rotate', 'footer-color', 'ghost', 'power', 'italic', 'frame'];

  readonly #els: Parts;
  readonly #footer: HTMLElement;
  readonly #fields: HTMLElement;
  #state: DateTimeFields = { month: 'JAN', day: '01', year: '1972', hour: '12', minute: '00', second: '00', isAM: true };
  #monthIndex = 0;
  #timer: number | undefined;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>
      <div class="row" part="row"><div class="fields" part="fields"></div><div class="footer" part="footer"></div></div>`;
    (root.querySelector('.row') as HTMLElement).style.setProperty('--_granite', GRANITE);
    this.#fields = root.querySelector('.fields')!;
    this.#footer = root.querySelector('.footer')!;
    const led = (digit: number, seg: 7 | 16 = 7) => {
      const el = document.createElement('led-display');
      el.setAttribute('digit', String(digit));
      if (seg === 16) el.setAttribute('segment', '16');
      return el;
    };
    this.#els = {
      month: led(3, 16), day: led(2), year: led(4), hour: led(2), minute: led(2), second: led(2),
      ampm: document.createElement('led-ampm'), colon: document.createElement('led-colon'), colon2: document.createElement('led-colon'),
    };
  }

  connectedCallback(): void {
    if (!this.hasAttribute('value') || this.live) this.#setFromDate(new Date(), false);
    this.#render();
    this.#syncLive();
  }
  disconnectedCallback(): void { window.clearTimeout(this.#timer); this.#timer = undefined; }

  attributeChangedCallback(name: string, oldV: string | null, newV: string | null): void {
    if (name === 'format' && (oldV === '24') !== (newV === '24')) {
      let h = parseInt(this.#state.hour, 10) || 0;
      if (newV === '24') h = (h % 12) + (this.#state.isAM ? 0 : 12);
      else { this.#state.isAM = h < 12; h = h % 12 || 12; }
      this.#state.hour = two(h);
    }
    if (name === 'value' && !this.live) {
      const d = parseValue(newV, this.lang);
      if (d) this.#setFromDate(d, false);
    }
    if (name === 'lang' || name === 'months') this.#state.month = this.months[this.#monthIndex];
    if (name === 'live') this.#syncLive();
    if (this.isConnected) this.#render();
  }

  get color(): string { return this.getAttribute('color') || 'red'; }
  set color(v: string) { this.setAttribute('color', v); }
  get label(): string { return this.getAttribute('label') ?? ''; }
  set label(v: string) { this.setAttribute('label', v); }
  get live(): boolean { return this.hasAttribute('live') && !isFalse(this.getAttribute('live')); }
  set live(v: boolean) { this.toggleAttribute('live', v); }
  get power(): boolean { return !isFalse(this.getAttribute('power')); }
  set power(v: boolean) { this.setAttribute('power', v ? 'on' : 'off'); }
  get lang(): Lang { return normLang(this.getAttribute('lang')); }
  set lang(v: Lang) { this.setAttribute('lang', v); }
  get format(): 12 | 24 { return this.getAttribute('format') === '24' ? 24 : 12; }
  set format(v: 12 | 24) { this.setAttribute('format', String(v)); }
  get months(): string[] {
    const list = (this.getAttribute('months') ?? '').split(',').map((m) => m.trim()).filter(Boolean);
    return list.length === 12 ? list : MONTHS_BY_LANG[this.lang];
  }

  get date(): Date {
    const s = this.#state;
    let h = parseInt(s.hour, 10) || 0;
    if (this.format === 12) h = (h % 12) + (s.isAM ? 0 : 12);
    return new Date(parseInt(s.year, 10) || 0, this.#monthIndex, parseInt(s.day, 10) || 1, h, parseInt(s.minute, 10) || 0, parseInt(s.second, 10) || 0);
  }
  set date(d: Date) { if (!isNaN(d.getTime())) this.#setFromDate(d); }

  /** Mise à jour partielle : '' ou undefined = inchangé ; month accepte un nom ou 1–12. */
  update(patch: DateTimePatch = {}): void {
    const m = patch.month;
    if (m !== undefined && m !== '') {
      const n = typeof m === 'number' || /^\d{1,2}$/.test(m) ? Number(m) - 1 : -1;
      if (n >= 0 && n < 12) { this.#monthIndex = n; this.#state.month = this.months[n]; }
      else {
        const s = String(m).toUpperCase();
        const i = [this.months, MONTHS_BY_LANG.en, MONTHS_BY_LANG.fr].map((l) => l.indexOf(s)).find((x) => x >= 0);
        if (i !== undefined) { this.#monthIndex = i; this.#state.month = this.months[i]; }
        else this.#state.month = String(m); // texte libre (ex. '   ' pour vider la case)
      }
    }
    for (const k of ['day', 'year', 'hour', 'minute', 'second'] as const) {
      const v = patch[k];
      if (v !== undefined && v !== '') this.#state[k] = String(v);
    }
    if (typeof patch.isAM === 'boolean') this.#state.isAM = patch.isAM;
    this.#render();
    this.dispatchEvent(new CustomEvent<DateTimeFields>('time-change', { detail: this.getDateTime(), bubbles: true }));
  }

  getDateTime(): DateTimeFields { return { ...this.#state }; }

  #setFromDate(d: Date, render = true): void {
    let h = d.getHours();
    const isAM = h < 12;
    if (this.format === 12) h = h % 12 || 12;
    this.#monthIndex = d.getMonth();
    this.#state = {
      month: this.months[d.getMonth()], day: two(d.getDate()), year: String(d.getFullYear()).padStart(4, '0'),
      hour: two(h), minute: two(d.getMinutes()), second: two(d.getSeconds()), isAM,
    };
    if (render) this.update({});
  }

  #syncLive(): void {
    window.clearTimeout(this.#timer);
    this.#timer = undefined;
    if (!this.live || !this.isConnected) return;
    const tick = () => {
      this.#setFromDate(new Date());
      this.#timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
  }

  #render(): void {
    const e = this.#els, s = this.#state, lang = this.lang;
    const parts = (this.getAttribute('labels') ?? '').split(',').map((t) => t.trim());
    const [lM, lD, lY, lH, lMi, lS] = LABELS_BY_LANG[lang].map((d, i) => (parts.length === 6 ? parts[i] : d));
    const labelColor = this.getAttribute('label-color') || 'red';
    const power = this.power ? 'on' : 'off';
    const common: Record<string, string> = { color: this.color, 'label-color': labelColor, power, 'label-rotate': this.getAttribute('label-rotate') || '0' };
    for (const a of ['ghost', 'italic']) { const v = this.getAttribute(a); if (v !== null) common[a] = v; }

    setAttrs(e.month, { ...common, label: lM, value: s.month });
    setAttrs(e.day, { ...common, label: lD, value: s.day });
    setAttrs(e.year, { ...common, label: lY, value: s.year });
    setAttrs(e.hour, { ...common, label: lH, value: s.hour });
    setAttrs(e.minute, { ...common, label: lMi, value: s.minute });
    setAttrs(e.second, { ...common, label: lS, value: s.second });
    setAttrs(e.ampm, { value: s.isAM ? 'am' : 'pm', 'label-color': labelColor, power, labels: this.getAttribute('ampm-labels') || 'AM,PM' });
    setAttrs(e.colon, { color: this.color, power });
    setAttrs(e.colon2, { color: this.color, power });

    const order = lang === 'fr'
      ? [e.day, e.month, e.year, e.ampm, e.hour, e.colon, e.minute, e.colon2, e.second]
      : [e.month, e.day, e.year, e.ampm, e.hour, e.colon, e.minute, e.colon2, e.second];
    if (order.some((el, i) => this.#fields.children[i] !== el)) this.#fields.replaceChildren(...order);

    e.ampm.hidden = this.format === 24;
    const withSec = this.hasAttribute('seconds') && !isFalse(this.getAttribute('seconds'));
    e.colon2.hidden = e.second.hidden = !withSec;

    this.#footer.style.setProperty('--_footer', ribbonColor(this.getAttribute('footer-color'), '#0a0a0a'));
    this.#footer.textContent = this.label;
    this.#footer.hidden = !this.label.trim();
    this.setAttribute('role', 'group');
    const date = lang === 'fr' ? `${s.day} ${s.month} ${s.year}` : `${s.month} ${s.day} ${s.year}`;
    this.setAttribute('aria-label', `${this.label} ${date} ${s.hour}:${s.minute}${this.format === 12 ? (s.isAM ? ' AM' : ' PM') : ''}`.trim());
  }
}

define('time-circuit', TimeCircuit);
declare global {
  interface HTMLElementTagNameMap { 'time-circuit': TimeCircuit }
  interface HTMLElementEventMap { 'time-change': CustomEvent<DateTimeFields> }
}
