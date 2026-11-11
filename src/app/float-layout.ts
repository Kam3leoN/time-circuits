/**
 * Instruments flottants : drag & drop, positions en % du panneau, persistées dans Settings.
 * CSS : --fx / --fy = left/top en % du calque (coin haut-gauche).
 */
import { saveSettings, type FloatId, type FloatPos, type Settings, defaultFloats } from './storage';

const THRESHOLD_PX = 5;

type Drag = {
  id: FloatId;
  el: HTMLElement;
  ox: number;
  oy: number;
  sx: number;
  sy: number;
  moved: boolean;
};

export class FloatLayout {
  readonly #layer: HTMLElement;
  readonly #s: Settings;
  #drag: Drag | null = null;

  constructor(layer: HTMLElement, s: Settings) {
    this.#layer = layer;
    this.#s = s;
    this.apply();
    requestAnimationFrame(() => this.apply());

    layer.addEventListener('pointerdown', (e) => this.#onDown(e));
    window.addEventListener('pointermove', (e) => this.#onMove(e));
    window.addEventListener('pointerup', (e) => this.#onUp(e));
    window.addEventListener('pointercancel', (e) => this.#onUp(e));
    window.addEventListener('resize', () => this.#clampAll());
  }

  /** Applique les positions sauvegardées (ou les défauts). */
  apply(): void {
    const map = { ...defaultFloats(), ...this.#s.floats };
    for (const el of this.#items()) {
      const id = el.dataset.float as FloatId | undefined;
      if (!id || !map[id]) continue;
      this.#place(el, map[id]);
    }
  }

  /** Remet les positions d’usine et sauve. */
  reset(): void {
    this.#s.floats = defaultFloats();
    saveSettings(this.#s);
    this.apply();
  }

  #items(): HTMLElement[] {
    return [...this.#layer.querySelectorAll<HTMLElement>('.tc-float[data-float]')];
  }

  #box(): DOMRect {
    return this.#layer.getBoundingClientRect();
  }

  #read(el: HTMLElement): FloatPos {
    return {
      x: parseFloat(el.style.getPropertyValue('--fx') || '0') || 0,
      y: parseFloat(el.style.getPropertyValue('--fy') || '0') || 0,
    };
  }

  #write(el: HTMLElement, p: FloatPos): void {
    el.style.setProperty('--fx', String(p.x));
    el.style.setProperty('--fy', String(p.y));
  }

  #clamp(p: FloatPos, el: HTMLElement): FloatPos {
    const box = this.#box();
    const maxX = box.width > 0 ? Math.max(0, (1 - el.offsetWidth / box.width) * 100) : 100;
    const maxY = box.height > 0 ? Math.max(0, (1 - el.offsetHeight / box.height) * 100) : 100;
    return {
      x: Math.round(Math.max(0, Math.min(maxX, p.x)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(maxY, p.y)) * 10) / 10,
    };
  }

  #place(el: HTMLElement, p: FloatPos): void {
    this.#write(el, this.#clamp(p, el));
  }

  #clampAll(): void {
    for (const el of this.#items()) this.#place(el, this.#read(el));
  }

  #save(id: FloatId, p: FloatPos): void {
    this.#s.floats = { ...defaultFloats(), ...this.#s.floats, [id]: p };
    saveSettings(this.#s);
  }

  #onDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement | null)?.closest?.('.tc-float') as HTMLElement | null;
    if (!el || !this.#layer.contains(el)) return;
    const id = el.dataset.float as FloatId | undefined;
    if (!id) return;

    const rect = el.getBoundingClientRect();
    this.#drag = {
      id, el,
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
    };
    el.classList.add('dragging');
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  #onMove(e: PointerEvent): void {
    const d = this.#drag;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && dx * dx + dy * dy < THRESHOLD_PX * THRESHOLD_PX) return;
    d.moved = true;
    e.preventDefault();

    const box = this.#box();
    if (box.width < 1 || box.height < 1) return;
    this.#place(d.el, {
      x: ((e.clientX - d.ox - box.left) / box.width) * 100,
      y: ((e.clientY - d.oy - box.top) / box.height) * 100,
    });
  }

  #onUp(e: PointerEvent): void {
    const d = this.#drag;
    if (!d) return;
    d.el.classList.remove('dragging');
    try { d.el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (d.moved) {
      const p = this.#clamp(this.#read(d.el), d.el);
      this.#write(d.el, p);
      this.#save(d.id, p);
      // Empêche le « press » reset juste après un drag.
      d.el.dataset.suppressClick = '1';
      setTimeout(() => { delete d.el.dataset.suppressClick; }, 0);
    }
    this.#drag = null;
  }
}
