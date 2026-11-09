/**
 * <set-to-88> — compteur « SET / TO / 88 ».
 * Attributs : value (0–999) · target (88 ; 142 pour les km/h → 3 cases) · color (amber) · unit (ruban au-dessus)
 *   · unit-color (red) · labels ("SET,TO,88") · ghost · italic · label-rotate · power
 * API : await run({ target, duration, step, hold }) · reset() · cancel() · speed. Événements : speed-change, target-reached.
 */
import './led-display';
import css from './set-to-88.scss?inline';
import { define, isFalse, setAttrs } from './palette';
import type { LedDisplay } from './led-display';

export interface RunOptions { target?: number; duration?: number; step?: number; hold?: number }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<number>((r) => requestAnimationFrame(r));

export class SetTo88 extends HTMLElement {
  static readonly observedAttributes = ['value', 'target', 'color', 'labels', 'ghost', 'power', 'italic', 'unit', 'unit-color', 'label-rotate'];
  readonly #led: LedDisplay;
  readonly #tags: NodeListOf<HTMLElement>;
  #run = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>
      <div class="wrap" part="wrapper">
        <div class="tags" part="labels"><span class="tag"></span><span class="tag"></span><span class="tag"></span></div>
        <led-display digit="2" label="" part="lcd"></led-display>
      </div>`;
    this.#led = root.querySelector('led-display')!;
    this.#tags = root.querySelectorAll('.tag');
  }
  connectedCallback(): void { this.#render(); }
  attributeChangedCallback(): void { if (this.isConnected) this.#render(); }

  get target(): number { const n = parseInt(this.getAttribute('target') ?? '', 10); return Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 88; }
  set target(v: number) { this.setAttribute('target', String(v)); }
  get digits(): number { return Math.max(2, String(this.target).length); }
  get speed(): number { const n = parseInt(this.getAttribute('value') ?? '', 10); return Number.isFinite(n) ? n : 0; }
  set speed(v: number) {
    const n = Math.max(0, Math.min(999, Math.round(Number(v) || 0)));
    this.setAttribute('value', String(n));
    this.dispatchEvent(new CustomEvent('speed-change', { detail: { speed: n }, bubbles: true }));
  }
  get power(): boolean { return !isFalse(this.getAttribute('power')); }
  set power(v: boolean) { this.setAttribute('power', v ? 'on' : 'off'); }

  reset(): void { this.#run++; this.speed = 0; }
  cancel(): void { this.#run++; }

  /** Accélération : jusqu'à target − 8 en `duration` (ease-out), puis +1 tous les `step` ms, pause `hold`. */
  async run({ target = this.target, duration = 1000, step = 150, hold = 1000 }: RunOptions = {}): Promise<boolean> {
    const id = ++this.#run;
    const ramp = Math.max(0, target - 8);
    this.speed = 0;
    const t0 = performance.now();
    for (;;) {
      await frame();
      if (id !== this.#run) return false;
      const k = Math.min((performance.now() - t0) / duration, 1);
      this.speed = Math.floor(ramp * (1 - Math.pow(1 - k, 3)));
      if (k >= 1) break;
    }
    for (let v = ramp; v <= target; v++) {
      if (id !== this.#run) return false;
      this.speed = v;
      if (v < target) await sleep(step);
    }
    this.dispatchEvent(new CustomEvent('target-reached', { detail: { speed: target }, bubbles: true }));
    await sleep(hold);
    return id === this.#run;
  }

  #render(): void {
    const attrs: Record<string, string> = {
      label: this.getAttribute('unit') ?? '', 'label-color': this.getAttribute('unit-color') || 'red',
      color: this.getAttribute('color') || 'amber', digit: String(this.digits),
      value: String(this.speed).padStart(this.digits, '0'), power: this.power ? 'on' : 'off',
    };
    for (const a of ['ghost', 'italic', 'label-rotate']) { const v = this.getAttribute(a); if (v !== null) attrs[a] = v; }
    setAttrs(this.#led, attrs);
    const parts = (this.getAttribute('labels') || `SET,TO,${this.target}`).split(',').map((t) => t.trim());
    this.#tags.forEach((t, i) => { t.textContent = parts[i] ?? ''; t.hidden = !parts[i]; });
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', `${parts.join(' ')} : ${this.speed} ${this.getAttribute('unit') ?? ''}`.trim());
  }
}

define('set-to-88', SetTo88);
declare global { interface HTMLElementTagNameMap { 'set-to-88': SetTo88 } }
