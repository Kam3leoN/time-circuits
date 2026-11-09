/** Éclairs bleu-blanc ramifiés (canvas), inspirés de la vidéo lightning.gif du projet. */

interface Bolt { pts: [number, number][]; w: number }

function boltPath(x0: number, y0: number, x1: number, y1: number, rough: number, depth: number, out: Bolt[], w: number): void {
  // Déplacement du point milieu : ligne brisée irrégulière.
  let pts: [number, number][] = [[x0, y0], [x1, y1]];
  let disp = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let i = 0; i < 7; i++) {
    const next: [number, number][] = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      next.push([(ax + bx) / 2 + (Math.random() - 0.5) * disp, (ay + by) / 2 + (Math.random() - 0.5) * disp * 0.35], [bx, by]);
    }
    pts = next;
    disp *= 0.55;
  }
  out.push({ pts, w });
  if (depth <= 0) return;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let b = 0; b < n; b++) {
    const [sx, sy] = pts[Math.floor(pts.length * (0.12 + Math.random() * 0.6))];
    const len = Math.hypot(x1 - x0, y1 - y0) * (0.25 + Math.random() * 0.35);
    const ang = Math.atan2(y1 - y0, x1 - x0) + (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.8);
    boltPath(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len, rough * 1.1, depth - 1, out, w * 0.55);
  }
}

function makeStorm(W: number, H: number): Bolt[] {
  const out: Bolt[] = [];
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const x0 = W * (0.08 + Math.random() * 0.84);
    boltPath(x0, -10, x0 + (Math.random() - 0.5) * W * 0.35, H * (0.55 + Math.random() * 0.45), 0.22, 2, out, (2.2 + Math.random()) * (W / 1200 + 0.6));
  }
  boltPath(0, H * (0.05 + Math.random() * 0.15), W * (0.35 + Math.random() * 0.3), H * (0.02 + Math.random() * 0.2), 0.18, 1, out, 1.2);
  return out;
}

/** Intensité (0–1) dans le temps : frappe, retombée, re-frappes, extinction. */
const KEYS: [number, number][] = [[0, 0], [0.03, 1], [0.08, 0.15], [0.12, 0.95], [0.2, 0.35], [0.26, 0.85], [0.36, 0.1], [0.44, 0.7], [0.52, 0.2], [0.6, 0.45], [0.7, 0.05], [0.78, 0.3], [1, 0]];
function level(p: number): number {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) { const [a, va] = KEYS[i - 1], [b, vb] = KEYS[i]; return va + (vb - va) * ((p - a) / (b - a)); }
  }
  return 0;
}

export function lightning(canvas: HTMLCanvasElement, duration = 1900): Promise<void> {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let storm = makeStorm(W, H), lastPeak = 0;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const draw = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const v = level(p);
      if (v > 0.8 && now - lastPeak > 220) { storm = makeStorm(W, H); lastPeak = now; }
      ctx.clearRect(0, 0, W, H);
      if (v > 0.01) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(70,95,220,${0.45 * v})`);
        sky.addColorStop(0.6, `rgba(30,45,140,${0.18 * v})`);
        sky.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const pass of [{ c: `rgba(110,140,255,${0.55 * v})`, k: 5, blur: 28 }, { c: `rgba(185,205,255,${0.85 * v})`, k: 2, blur: 10 }, { c: `rgba(255,255,255,${v})`, k: 0.9, blur: 0 }]) {
          ctx.shadowColor = 'rgba(120,150,255,.9)';
          ctx.shadowBlur = pass.blur;
          ctx.strokeStyle = pass.c;
          for (const b of storm) {
            ctx.lineWidth = Math.max(0.6, b.w * pass.k);
            ctx.beginPath();
            ctx.moveTo(b.pts[0][0], b.pts[0][1]);
            for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
      }
      if (p < 1) requestAnimationFrame(draw);
      else { ctx.clearRect(0, 0, W, H); resolve(); }
    };
    requestAnimationFrame(draw);
  });
}
