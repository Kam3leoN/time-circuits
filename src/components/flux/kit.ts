/** Utilitaires SVG partagés par les instruments flux (aiguilles, plaques alu, boucle RAF). */

export const FONT = 'Arial, Helvetica, sans-serif';
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

const rad = (d: number) => (d * Math.PI) / 180;
export const f = (n: number) => n.toFixed(1);

export function pt(px: number, py: number, r: number, deg: number): [number, number] {
  return [px + r * Math.sin(rad(deg)), py - r * Math.cos(rad(deg))];
}

export function arc(px: number, py: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(px, py, r, a0);
  const [x1, y1] = pt(px, py, r, a1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 0 1 ${f(x1)} ${f(y1)}`;
}

export function ticks(
  px: number, py: number, a0: number, a1: number, n: number,
  r0: number, r1: number, color: string, w: number,
): string {
  let s = '';
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const [x0, y0] = pt(px, py, r0, a);
    const [x1, y1] = pt(px, py, r1, a);
    s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${color}" stroke-width="${w}"/>`;
  }
  return s;
}

export function labels(
  px: number, py: number, r: number, a0: number, a1: number,
  list: string[], color: string, size: number, skip?: string[],
): string {
  return list.map((t, i) => {
    if (skip?.includes(t)) return '';
    const a = a0 + ((a1 - a0) * i) / (list.length - 1);
    const [x, y] = pt(px, py, r, a);
    return `<text x="${f(x)}" y="${f(y)}" fill="${color}" font-size="${size}" font-family="${FONT}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${f(a * 0.55)} ${f(x)} ${f(y)})">${t}</text>`;
  }).join('');
}

export const screw = (p: string, x: number, y: number, r: number, rot: number): string =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="${r}" fill="url(#${p}screw)" stroke="#55585c" stroke-width=".8"/><rect x="${-r * 0.75}" y="-.9" width="${r * 1.5}" height="1.8" fill="#3a3c3f"/></g>`;

export const plate = (p: string, w: number, h: number): string => `
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="8" fill="url(#${p}alu)"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="8" fill="#fff" filter="url(#${p}brush)" opacity=".55"/>
  <rect x="10.75" y="10.75" width="${w - 21.5}" height="${h - 21.5}" rx="7.5" fill="none" stroke="url(#${p}edge)" stroke-width="1.5"/>
  ${screw(p, 28, 28, 6, 30)}${screw(p, w - 28, 28, 6, 75)}${screw(p, 28, h - 28, 6, -20)}${screw(p, w - 28, h - 28, 6, -55)}`;

export const defs = (p: string): string => `
  <linearGradient id="${p}alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ccd0"/><stop offset=".5" stop-color="#b3b7bc"/><stop offset="1" stop-color="#9da1a7"/></linearGradient>
  <filter id="${p}brush" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.28"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <linearGradient id="${p}edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
  <radialGradient id="${p}screw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f1f1f1"/><stop offset="1" stop-color="#8b8e92"/></radialGradient>
  <linearGradient id="${p}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>`;

/** Aiguille amortie ; retourne un step(target, dt, now, live). */
export function needle(
  el: Element, px: number, py: number, start: number, k: number, c: number,
): (target: number, dt: number, now: number, live: boolean) => void {
  let pos = start;
  let vel = 0;
  return (target, dt, now, live) => {
    const t = target + (live && !REDUCE ? Math.sin(now / 130 + px) * 0.35 + Math.sin(now / 47 + py) * 0.2 : 0);
    if (REDUCE) pos = t;
    else {
      vel += ((t - pos) * k - vel * c) * dt;
      pos += vel * dt;
    }
    el.setAttribute('transform', `rotate(${pos.toFixed(2)} ${px} ${py})`);
  };
}

/** Boucle RAF ; retourne une fonction d’arrêt. */
export function loop(fn: (dt: number, now: number) => void): () => void {
  let last = performance.now();
  let id = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fn(dt, now);
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(id);
}

let uid = 0;
export const prefix = (tag: string) => `${tag}${++uid}-`;
