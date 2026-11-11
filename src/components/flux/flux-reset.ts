/**
 * <flux-reset> — bouton jaune RESET (tréfle radioactif), sans bandeau ni cadre noir.
 * Attributs : label (aria). Événement : press
 */
import css from './flux.scss?inline';
import { defs, prefix } from './kit';
import { define } from '../palette';

const CX = 110;
const CY = 98;
const INK = '#1a1403';

export class FluxReset extends HTMLElement {
  static readonly observedAttributes = ['label'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.#mount();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#mount();
  }

  #lbl(): string {
    return this.getAttribute('label')?.trim() || 'RESET';
  }

  #mount(): void {
    const P = prefix('rb');
    const label = this.#lbl();
    const q = (r: number, a: number): string => {
      const t = (a * Math.PI) / 180;
      return `${(CX + r * Math.cos(t)).toFixed(2)} ${(CY + r * Math.sin(t)).toFixed(2)}`;
    };
    this.shadowRoot!.innerHTML = `<style>${css}</style>
      <svg viewBox="60 48 100 100" role="img" aria-label="${label}">
        <defs>${defs(P)}
          <linearGradient id="${P}btn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe04a"/><stop offset="1" stop-color="#e9a90e"/></linearGradient>
        </defs>
        <g data-reset role="button" tabindex="0" aria-label="${label}">
          <g data-cap>
            <rect x="62" y="50" width="96" height="96" rx="8" fill="url(#${P}btn)"/>
            <rect x="63" y="51" width="94" height="94" rx="7" fill="none" stroke="#7a5200" stroke-opacity=".7" stroke-width="1.5"/>
            <line x1="68" y1="53.5" x2="152" y2="53.5" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>
            <circle cx="${CX}" cy="${CY}" r="6.8" fill="${INK}"/>
            ${[90, 210, 330].map((c) =>
              `<path d="M${q(11.2, c - 30)} L${q(32, c - 30)} A32 32 0 0 1 ${q(32, c + 30)} L${q(11.2, c + 30)} A11.2 11.2 0 0 0 ${q(11.2, c - 30)} Z" fill="${INK}"/>`,
            ).join('')}
          </g>
        </g>
      </svg>`;
    const btn = this.shadowRoot!.querySelector('[data-reset]')!;
    const fire = () => {
      const host = this.closest('.tc-float') as HTMLElement | null;
      if (host?.dataset.suppressClick === '1') return;
      this.dispatchEvent(new CustomEvent('press', { bubbles: true, composed: true }));
    };
    btn.addEventListener('click', fire);
    btn.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') { ke.preventDefault(); fire(); }
    });
  }
}

define('flux-reset', FluxReset);

declare global {
  interface HTMLElementTagNameMap { 'flux-reset': FluxReset }
}
