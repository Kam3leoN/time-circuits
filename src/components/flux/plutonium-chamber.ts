/**
 * <plutonium-chamber> — cadran ROENTGENS + voyant EMPTY.
 * Attributs : value (0–1) · label-empty · label-unit · label-title
 * Événement : empty-change { detail: { empty } }
 */
import css from './flux.scss?inline';
import { arc, defs, f, FONT, labels, loop, needle, prefix, pt, REDUCE, screw, ticks } from './kit';
import { define } from '../palette';

const A = 42;
const CX = 210;
const PY = 289;
const EMPTY_AT = 0.03;

export class PlutoniumChamber extends HTMLElement {
  static readonly observedAttributes = ['value', 'label-empty', 'label-unit', 'label-title'];
  #stop: (() => void) | null = null;
  #step: ((t: number, dt: number, now: number, live: boolean) => void) | null = null;
  #level = 1;
  #empty = false;
  #lamp: Element | null = null;

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
    if (name === 'label-empty' || name === 'label-unit' || name === 'label-title') this.#mount();
    this.#sync();
  }

  get value(): number { return this.#level; }
  set value(v: number) {
    this.#level = Math.max(0, Math.min(1, v));
    this.setAttribute('value', String(this.#level));
  }

  get empty(): boolean { return this.#empty; }

  #lbl(attr: string, fallback: string): string {
    return this.getAttribute(attr)?.trim() || fallback;
  }

  #mount(): void {
    this.#stop?.();
    const P = prefix('pc');
    const emptyLbl = this.#lbl('label-empty', 'EMPTY');
    const unitLbl = this.#lbl('label-unit', 'ROENTGENS');
    const titleLbl = this.#lbl('label-title', 'PLUTONIUM CHAMBER');
    const lampText = (fill: string) =>
      `<text data-i18n-empty x="${CX}" y="67" fill="${fill}" font-family="${FONT}" font-weight="700" font-size="12.5" text-anchor="middle" dominant-baseline="central">${emptyLbl}</text>`;
    const [a, b] = pt(CX, PY, 148, -47.5);
    const [c, d] = pt(CX, PY, 176, -47.5);
    const [e, g] = pt(CX, PY, 139, -50);
    this.shadowRoot!.innerHTML = `<style>${css}</style>
      <svg viewBox="38 21 344 308" role="img" aria-label="${titleLbl}">
        <defs>${defs(P)}
          <linearGradient id="${P}case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#262626"/><stop offset=".4" stop-color="#101010"/><stop offset="1" stop-color="#060606"/></linearGradient>
          <linearGradient id="${P}lensOff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3352a"/><stop offset="1" stop-color="#8a1f18"/></linearGradient>
          <radialGradient id="${P}lensOn" cx=".5" cy=".62" r=".75"><stop offset="0" stop-color="#ffc48a"/><stop offset=".4" stop-color="#ff7a45"/><stop offset="1" stop-color="#f0452a"/></radialGradient>
          <radialGradient id="${P}halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff5a2c" stop-opacity=".6"/><stop offset="1" stop-color="#ff5a2c" stop-opacity="0"/></radialGradient>
        </defs>
        <rect x="48" y="31" width="324" height="288" rx="16" fill="url(#${P}case)"/>
        <rect x="49" y="32" width="322" height="286" rx="15" fill="none" stroke="#3c3c3c"/>
        <rect x="62" y="47" width="296" height="168" rx="13" fill="#050505"/>
        <rect x="66" y="51" width="288" height="160" rx="10" fill="#e9e6da"/>
        <path d="${arc(CX, PY, 165, -A, A)}" fill="none" stroke="#2f7d4a" stroke-width="1.4"/>
        ${ticks(CX, PY, -A, A, 6, 165, 175, '#2f7d4a', 1.6)}
        ${ticks(CX, PY, -A, A, 30, 165, 171, '#2f7d4a', 0.8)}
        ${labels(CX, PY, 186, -A, A, ['0', '100', '200', '300', '400', '500', '600'], '#2f7d4a', 12.5, ['300'])}
        ${ticks(CX, PY, -A, A, 4, 156, 165, '#161616', 1.6)}
        ${ticks(CX, PY, -A, A, 20, 160, 165, '#161616', 0.8)}
        ${labels(CX, PY, 145, -A, A, ['0', '50', '100', '150', '200'], '#161616', 12.5)}
        <line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" stroke="#c8251d" stroke-width="1.8"/>
        <text x="${f(e)}" y="${f(g)}" fill="#c8251d" font-family="${FONT}" font-size="12" text-anchor="middle" dominant-baseline="middle" transform="rotate(-40 ${f(e)} ${f(g)})">A</text>
        <text data-i18n-unit x="${CX + 0.6}" y="185" fill="#161616" font-family="${FONT}" font-weight="700" font-size="16" letter-spacing="1.2" text-anchor="middle">${unitLbl}</text>
        <line x1="${CX - 54}" y1="190" x2="${CX + 54}" y2="190" stroke="#161616" stroke-width="1.4"/>
        <text x="344" y="205" fill="#161616" font-family="${FONT}" font-size="7.5" text-anchor="end">F.S.= 100 µA</text>
        <clipPath id="${P}clip"><rect x="66" y="51" width="288" height="160" rx="10"/></clipPath>
        <g clip-path="url(#${P}clip)"><line data-needle x1="${CX}" y1="${PY}" x2="${CX}" y2="${PY - 172}" stroke="#101010" stroke-width="1.7" stroke-linecap="round"/></g>
        <rect x="66" y="51" width="288" height="160" rx="10" fill="url(#${P}glass)"/>
        <rect x="176" y="41" width="68" height="52" rx="4" fill="#070707"/>
        <rect x="180" y="45" width="60" height="44" rx="2" fill="url(#${P}lensOff)"/>
        ${lampText('#3a0f0b')}
        <g class="lampOn" data-lamp>
          <ellipse cx="${CX}" cy="67" rx="62" ry="50" fill="url(#${P}halo)"/>
          <rect x="180" y="45" width="60" height="44" rx="2" fill="url(#${P}lensOn)"/>
          ${lampText('#3d0d04')}
        </g>
        <rect x="180.5" y="45.5" width="59" height="43" rx="2" fill="none" stroke="#000" stroke-opacity=".35"/>
        <line x1="182" y1="46.5" x2="238" y2="46.5" stroke="#fff" stroke-opacity=".28"/>
        <rect x="56" y="221" width="308" height="25" fill="#060606"/>
        <text data-i18n-title x="${CX + 1.2}" y="233.5" fill="#f5f5f2" font-family="${FONT}" font-weight="700" font-size="${titleLbl.length > 18 ? 14 : 18}" letter-spacing="2.4" text-anchor="middle" dominant-baseline="central">${titleLbl}</text>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="${194 + i * 7}" y="251" width="3.4" height="62" rx="1.5" fill="#000" opacity=".8"/>`).join('')}
        ${[0, 1, 2].map((i) => `<rect x="${64 + i * 7}" y="257" width="3.4" height="56" rx="1.5" fill="#000" opacity=".8"/><rect x="${339 + i * 7}" y="257" width="3.4" height="56" rx="1.5" fill="#000" opacity=".8"/>`).join('')}
        <circle cx="${CX}" cy="279" r="7.5" fill="#0a0a0a" stroke="#333"/>
        ${screw(P, CX, 279, 4.6, 90)}${screw(P, 100, 285, 5, 20)}${screw(P, 320, 285, 5, -35)}
      </svg>`;
    this.#lamp = this.shadowRoot!.querySelector('[data-lamp]');
    this.#step = needle(this.shadowRoot!.querySelector('[data-needle]')!, CX, PY, -A, 60, 7);
    this.#stop = loop((dt, now) => {
      const empty = this.#level <= EMPTY_AT;
      this.#step!(-A + 2 * A * this.#level, dt, now, !empty);
      if (empty !== this.#empty) {
        this.#empty = empty;
        this.dispatchEvent(new CustomEvent('empty-change', { detail: { empty }, bubbles: true, composed: true }));
      }
      this.#lamp?.classList.toggle('on', empty && (REDUCE || Math.floor(now / 380) % 2 === 0));
    });
  }

  #sync(): void {
    const raw = parseFloat(this.getAttribute('value') ?? '');
    this.#level = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
  }
}

define('plutonium-chamber', PlutoniumChamber);

declare global {
  interface HTMLElementTagNameMap { 'plutonium-chamber': PlutoniumChamber }
}
