/**
 * <needle-gauge> — cadran UNIQUE (PERCENT POWER, etc.).
 * Attributs : strips (libellés Dymo « TEXTE|dy|w ; … ») · value (0–1) · backlight · plate (off = sans plaque alu)
 */
import css from './flux.scss?inline';
import { arc, defs, FONT, labels, loop, needle, plate, prefix, ticks } from './kit';
import { define, isFalse } from '../palette';

const A = 48;
const W = 370;
const H = 350;
const CX = 185;
const CY = 175;
const PY = CY + 38;
/** Cadre serré autour du bezel quand la plaque alu est absente. */
const BARE_VB = '30 20 310 310';

type Strip = [string, number, number];

function parseStrips(raw: string | null): Strip[] {
  if (!raw?.trim()) return [['PRIMARY', -10, 100]];
  return raw.split(';').map((part) => {
    const [text, dy, w] = part.split('|');
    return [text.trim(), Number(dy) || 0, Number(w) || 100] as Strip;
  });
}

const dymo = (cx: number, y: number, w: number, text: string) =>
  `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="20" rx="1.5" fill="#0c0c0c"/><rect x="${cx - w / 2}" y="${y}" width="${w}" height="1.2" fill="#3a3a3a"/><text x="${cx + 1}" y="${y + 10.5}" fill="#f4f4f0" font-family="${FONT}" font-weight="700" font-size="14" letter-spacing="2" text-anchor="middle" dominant-baseline="central">${text}</text>`;

export class NeedleGauge extends HTMLElement {
  static readonly observedAttributes = ['strips', 'value', 'backlight', 'plate'];
  #stop: (() => void) | null = null;
  #step: ((t: number, dt: number, now: number, live: boolean) => void) | null = null;
  #v = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.#mount();
    this.#sync();
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = null;
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === 'strips' || name === 'plate') this.#mount();
    this.#sync();
  }

  get value(): number { return this.#v; }
  set value(n: number) {
    this.#v = Math.max(0, Math.min(1, n));
    this.setAttribute('value', String(this.#v));
  }

  get backlight(): boolean { return !isFalse(this.getAttribute('backlight')); }
  set backlight(on: boolean) { this.setAttribute('backlight', on ? 'on' : 'off'); }
  get showPlate(): boolean { return !isFalse(this.getAttribute('plate')); }

  #mount(): void {
    this.#stop?.();
    const P = prefix('ng');
    const strips = parseStrips(this.getAttribute('strips'));
    const aria = strips.map((s) => s[0]).join(' ');
    const withPlate = this.showPlate;
    const vb = withPlate ? `0 0 ${W} ${H}` : BARE_VB;
    this.shadowRoot!.innerHTML = `<style>${css}</style>
      <svg viewBox="${vb}" role="img" aria-label="${aria}">
        <defs>${defs(P)}
          <radialGradient id="${P}bezel" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#2e2e2e"/><stop offset=".5" stop-color="#121212"/><stop offset="1" stop-color="#050505"/></radialGradient>
          <radialGradient id="${P}lit" cx=".5" cy=".95" r=".95"><stop offset="0" stop-color="#fffbd0"/><stop offset=".18" stop-color="#ffe45a"/><stop offset=".6" stop-color="#f2c22e" stop-opacity=".85"/><stop offset="1" stop-color="#d9a41c" stop-opacity=".55"/></radialGradient>
        </defs>
        ${withPlate ? plate(P, W, H) : ''}
        <circle cx="${CX}" cy="${CY}" r="150" fill="url(#${P}bezel)"/>
        <circle cx="${CX}" cy="${CY}" r="148" fill="none" stroke="#3b3b3b"/>
        <g transform="translate(${CX} ${CY}) scale(1.58) translate(${-CX} ${-CY})">
          <circle cx="${CX}" cy="${CY}" r="90" fill="#050505"/>
          <circle cx="${CX}" cy="${CY}" r="88" fill="none" stroke="#2c2c2c" stroke-width="1.5"/>
          <circle cx="${CX}" cy="${CY}" r="80" fill="#e8e5d8"/>
          <circle class="glow" cx="${CX}" cy="${CY}" r="80" fill="url(#${P}lit)"/>
          <path d="${arc(CX, PY, 78, -A, A)}" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
          ${ticks(CX, PY, -A, A, 10, 70, 78, '#1a1a1a', 1.5)}
          ${ticks(CX, PY, -A, A, 50, 74, 78, '#1a1a1a', 0.7)}
          ${labels(CX, PY, 88, -A, A, ['0', '.2', '.4', '.6', '.8', '1.0'], '#1a1a1a', 11)}
          ${strips.map((s) => dymo(CX, CY + s[1], s[2], s[0])).join('')}
          <clipPath id="${P}clip"><circle cx="${CX}" cy="${CY}" r="80"/></clipPath>
          <g clip-path="url(#${P}clip)"><line data-needle x1="${CX}" y1="${PY}" x2="${CX}" y2="${PY - 82}" stroke="#101010" stroke-width="1.8" stroke-linecap="round"/></g>
          <circle cx="${CX}" cy="${PY}" r="9.5" fill="#0b0b0b" stroke="#2e2e2e"/>
          <circle cx="${CX - 2.5}" cy="${PY - 3}" r="2.5" fill="#fff" opacity=".18"/>
          <circle cx="${CX}" cy="${CY}" r="80" fill="url(#${P}glass)"/>
        </g>
      </svg>`;
    const line = this.shadowRoot!.querySelector('[data-needle]')!;
    this.#step = needle(line, CX, PY, -A, 80, 8);
    this.#stop = loop((dt, now) => {
      this.#step!(-A + 2 * A * this.#v, dt, now, this.#v > 0.02);
    });
  }

  #sync(): void {
    const raw = parseFloat(this.getAttribute('value') ?? '');
    this.#v = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    this.shadowRoot?.querySelector('svg')?.classList.toggle('lit', this.backlight);
  }
}

define('needle-gauge', NeedleGauge);

declare global {
  interface HTMLElementTagNameMap { 'needle-gauge': NeedleGauge }
}
