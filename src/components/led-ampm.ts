/**
 * <led-ampm> — rubans AM / PM et leurs voyants.
 * Attributs : value am|pm · light-color (#ffff00) · label-color (red) · labels ("AM,PM") · power (on).
 */
import css from './led-ampm.scss?inline';
import { define, isFalse, ribbonColor } from './palette';

export class LedAmPm extends HTMLElement {
  static readonly observedAttributes = ['value', 'light-color', 'label-color', 'labels', 'power'];
  readonly #col: HTMLElement;
  readonly #am: HTMLElement;
  readonly #pm: HTMLElement;
  readonly #tags: NodeListOf<HTMLElement>;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>
      <div class="col" part="ampm">
        <span class="tag" part="label"></span><i class="light" part="light am"></i>
        <span class="tag" part="label"></span><i class="light" part="light pm"></i>
      </div>`;
    this.#col = root.querySelector('.col')!;
    [this.#am, this.#pm] = Array.from(root.querySelectorAll<HTMLElement>('.light'));
    this.#tags = root.querySelectorAll('.tag');
  }
  connectedCallback(): void { this.setAttribute('role', 'img'); this.#render(); }
  attributeChangedCallback(): void { if (this.isConnected) this.#render(); }

  get value(): 'am' | 'pm' { return /^pm$/i.test(this.getAttribute('value') ?? '') ? 'pm' : 'am'; }
  set value(v: 'am' | 'pm') { this.setAttribute('value', v); }
  get isAM(): boolean { return this.value === 'am'; }
  set isAM(v: boolean) { this.value = v ? 'am' : 'pm'; }
  get power(): boolean { return !isFalse(this.getAttribute('power')); }
  set power(v: boolean) { this.setAttribute('power', v ? 'on' : 'off'); }

  #render(): void {
    const s = this.#col.style;
    s.setProperty('--_light', this.getAttribute('light-color') || '#ffff00');
    s.setProperty('--_ribbon', ribbonColor(this.getAttribute('label-color'), '#880000'));
    const [a = 'AM', p = 'PM'] = (this.getAttribute('labels') || 'AM,PM').split(',').map((t) => t.trim());
    this.#tags[0].textContent = a;
    this.#tags[1].textContent = p;
    const on = this.power;
    this.#am.classList.toggle('on', on && this.isAM);
    this.#pm.classList.toggle('on', on && !this.isAM);
    this.setAttribute('aria-label', on ? (this.isAM ? a : p) : '');
  }
}

define('led-ampm', LedAmPm);
declare global { interface HTMLElementTagNameMap { 'led-ampm': LedAmPm } }
