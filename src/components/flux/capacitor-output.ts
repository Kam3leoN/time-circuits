/**
 * <capacitor-output> — flux capacitor BTTF (Y).
 * Tube transparent · 5 LEDs diffuses/tube · socle gris · boule rouge · câble jaune.
 * Propagation LED : boule → centre.
 */
import css from './flux.scss?inline';
import { loop, prefix, REDUCE } from './kit';
import { define } from '../palette';

/** Surface : plus haute que large, radius 26. */
const W = 300;
const H = 380;
const CX = 150;
const CY = 175;
const TIP = 9;
const BALL_R = 23;
const SOCLE_R = 38; // fixe (2× ancienne boule) — ne suit pas BALL_R
const BALL = 118;
const TUBE_END = BALL + 8;
const TUBE_H = 11;
const CABLE_LEN = 78;
const CABLE_R = 5.5;
const PLATE_R = 26;
const LED_N = 5;
const ARMS: { deg: number; yellow: 'down' | 'right' }[] = [
  { deg: 225, yellow: 'down' },
  { deg: 315, yellow: 'down' },
  { deg: 90, yellow: 'right' },
];

function localDir(deg: number, dir: 'down' | 'right'): [number, number] {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const [wx, wy] = dir === 'down' ? [0, 1] : [1, 0];
  return [cos * wx + sin * wy, -sin * wx + cos * wy];
}

function tubePath(): string {
  const h = TUBE_H;
  const flare = TIP + 14;
  return [
    `M${TIP} 0`,
    `L${flare} ${-h}`,
    `L${TUBE_END} ${-h}`,
    `A${h} ${h} 0 0 1 ${TUBE_END} ${h}`,
    `L${flare} ${h}`,
    'Z',
  ].join(' ');
}

/** Positions X des 5 LEDs (de la boule vers la pointe). */
function ledXs(): number[] {
  const x0 = BALL - BALL_R - 6;
  const x1 = TIP + 18;
  return Array.from({ length: LED_N }, (_, i) => x0 + ((x1 - x0) * i) / (LED_N - 1));
}

export class CapacitorOutput extends HTMLElement {
  static readonly observedAttributes = ['value'];
  #stop: (() => void) | null = null;
  #level = 1;

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

  attributeChangedCallback(): void {
    if (this.isConnected) this.#sync();
  }

  get value(): number { return this.#level; }
  set value(v: number) {
    this.#level = Math.max(0, Math.min(1, v));
    this.setAttribute('value', String(this.#level));
  }

  #mount(): void {
    this.#stop?.();
    const P = prefix('xc');
    const body = tubePath();
    const xs = ledXs();

    const armSvg = ({ deg, yellow }: (typeof ARMS)[number]) => {
      const [dx, dy] = localDir(deg, yellow);
      const ox = BALL + dx * 2;
      const oy = dy * 2;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Flux d’énergie allongé (pas des cercles) — 5 paquets le long du tube
      const leds = xs.map((x, li) => `
        <g data-led="${li}">
          <ellipse cx="${x.toFixed(1)}" cy="0" rx="18" ry="7" fill="url(#${P}fluxHalo)" opacity="0" filter="url(#${P}fluxBlur)"/>
          <ellipse cx="${x.toFixed(1)}" cy="0" rx="11" ry="3.2" fill="url(#${P}fluxCore)" opacity="0"/>
          <rect x="${(x - 9).toFixed(1)}" y="-1.4" width="18" height="2.8" rx="1.4" fill="#fffce8" opacity="0"/>
        </g>`).join('');

      return `<g transform="translate(${CX} ${CY}) rotate(${deg})">
        <circle cx="${BALL}" cy="0" r="${SOCLE_R}" fill="#6a6e74"/>

        <clipPath id="${P}clip${deg}"><path d="${body}"/></clipPath>
        <g clip-path="url(#${P}clip${deg})">${leds}</g>

        <!-- Tube sans contour -->
        <path d="${body}" fill="url(#${P}tube)" fill-opacity=".28"/>

        <g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) rotate(${ang.toFixed(2)})">
          <rect x="0" y="${-CABLE_R}" width="${CABLE_LEN}" height="${CABLE_R * 2}" rx="${CABLE_R}" fill="url(#${P}ylw)"/>
          <rect x="3" y="${-CABLE_R * 0.4}" width="${CABLE_LEN - 8}" height="${CABLE_R * 0.55}" rx="2" fill="#fff8b0" opacity=".4"/>
        </g>

        <circle cx="${BALL}" cy="0" r="${BALL_R}" fill="url(#${P}redBall)"/>
      </g>`;
    };

    this.shadowRoot!.innerHTML = `<style>${css}</style>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flux capacitor">
        <defs>
          <linearGradient id="${P}tube" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8a949e"/><stop offset=".5" stop-color="#4e5660"/><stop offset="1" stop-color="#323840"/>
          </linearGradient>
          <filter id="${P}fluxBlur" x="-60%" y="-120%" width="220%" height="340%">
            <feGaussianBlur stdDeviation="2.2"/>
          </filter>
          <radialGradient id="${P}redBall" cx=".5" cy=".5" r=".75">
            <stop offset="0" stop-color="#e02820"/><stop offset=".55" stop-color="#c01410"/><stop offset="1" stop-color="#6a0808"/>
          </radialGradient>
          <linearGradient id="${P}ylw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffe566"/><stop offset="1" stop-color="#c99608"/>
          </linearGradient>
          <linearGradient id="${P}fluxCore" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ff9a18" stop-opacity="0"/>
            <stop offset=".35" stop-color="#ffe060"/>
            <stop offset=".5" stop-color="#fffce8"/>
            <stop offset=".65" stop-color="#ffe060"/>
            <stop offset="1" stop-color="#ff9a18" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${P}fluxHalo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ff7010" stop-opacity="0"/>
            <stop offset=".5" stop-color="#ffc030" stop-opacity=".9"/>
            <stop offset="1" stop-color="#ff7010" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="${P}hub" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#fff8d0"/><stop offset=".4" stop-color="#ffb028" stop-opacity=".65"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/>
          </radialGradient>
          <!-- Ombre inset #000 sur le bloc -->
          <filter id="${P}inset" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur"/>
            <feOffset in="blur" dx="0" dy="3" result="offsetBlur"/>
            <feComposite in="offsetBlur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowMask"/>
            <feFlood flood-color="#000000" flood-opacity=".9" result="color"/>
            <feComposite in="color" in2="shadowMask" operator="in" result="inset"/>
            <feMerge>
              <feMergeNode in="SourceGraphic"/>
              <feMergeNode in="inset"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Surface #171717 + border 10px #000 + ombre inset interne -->
        <rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="${PLATE_R + 6}" ry="${PLATE_R + 6}" fill="#000000"/>
        <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="${PLATE_R}" ry="${PLATE_R}" fill="#171717" filter="url(#${P}inset)"/>

        <circle data-amb cx="${CX}" cy="${CY}" r="18" fill="url(#${P}hub)" opacity="0"/>
        ${ARMS.map((a) => armSvg(a)).join('')}
      </svg>`;

    // Grouper les LEDs par bras : chaque bras a LED_N groupes [data-led]
    const arms = [...this.shadowRoot!.querySelectorAll('svg > g')].filter((g) =>
      g.querySelector('[data-led]'),
    );
    const ledsByArm = arms.map((arm) =>
      [...arm.querySelectorAll('[data-led]')].map((g) => {
        const els = [...g.children] as SVGElement[];
        return { halo: els[0]!, core: els[1]!, beam: els[2]! };
      }),
    );
    const amb = this.shadowRoot!.querySelector('[data-amb]')!;
    let phase = 0;
    this.#stop = loop((dt) => {
      const on = this.#level > 0.03 ? 1 : 0;
      phase = (phase + dt * (1.1 + 2.8 * this.#level)) % 1;
      const t = REDUCE ? 0.55 : phase; // 0 = boule → 1 = pointe
      const a = on * this.#level;
      ledsByArm.forEach((leds) => {
        leds.forEach((led, i) => {
          const pos = i / (LED_N - 1);
          const dist = Math.abs(pos - t);
          // Traînée : pic net + queueue derrière (vers la boule)
          const trail = REDUCE
            ? a * (0.4 + 0.6 * (1 - pos))
            : a * Math.max(0, 1 - dist / 0.42) * (pos <= t + 0.02 ? 1 : 0.25);
          const bright = Math.min(1, trail * 1.35);
          led.halo.setAttribute('opacity', (bright * 0.95).toFixed(3));
          led.core.setAttribute('opacity', bright.toFixed(3));
          led.beam.setAttribute('opacity', (bright * 0.9).toFixed(3));
        });
      });
      amb.setAttribute('opacity', (a * Math.max(0, 1 - Math.abs(1 - t) / 0.3) * 0.8).toFixed(3));
    });
  }

  #sync(): void {
    const raw = parseFloat(this.getAttribute('value') ?? '');
    this.#level = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
  }
}

define('capacitor-output', CapacitorOutput);

declare global {
  interface HTMLElementTagNameMap { 'capacitor-output': CapacitorOutput }
}
