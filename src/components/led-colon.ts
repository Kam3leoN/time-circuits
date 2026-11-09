/**
 * <led-colon> — deux points clignotants entre heures et minutes.
 * Attributs : color (#ffffff) · blink (true) · power (on). Hauteur = case <led-display> de même --led-size.
 */
import css from './led-colon.scss?inline';
import { buildPalette, define, isFalse } from './palette';

export class LedColon extends HTMLElement {
  static readonly observedAttributes = ['color', 'blink', 'power'];
  readonly #col: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style><div class="col" part="colon"><i class="dot" part="dot"></i><i class="dot" part="dot"></i></div>`;
    this.#col = root.querySelector('.col')!;
  }
  connectedCallback(): void { this.setAttribute('aria-hidden', 'true'); this.#render(); }
  attributeChangedCallback(): void { if (this.isConnected) this.#render(); }

  get color(): string { return this.getAttribute('color') || '#ffffff'; }
  set color(v: string) { this.setAttribute('color', v); }
  get blink(): boolean { return !isFalse(this.getAttribute('blink')); }
  set blink(v: boolean) { this.setAttribute('blink', String(v)); }
  get power(): boolean { return !isFalse(this.getAttribute('power')); }
  set power(v: boolean) { this.setAttribute('power', v ? 'on' : 'off'); }

  #render(): void {
    this.#col.style.setProperty('--_c', buildPalette(this.color).main);
    this.dataset.blink = this.blink ? 'on' : 'off';
    this.dataset.power = this.power ? 'on' : 'off';
  }
}

define('led-colon', LedColon);
declare global { interface HTMLElementTagNameMap { 'led-colon': LedColon } }
