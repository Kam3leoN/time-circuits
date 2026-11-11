/** Petits utilitaires d'interface. */
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} introuvable`);
  return el as T;
};

/** Comme `$`, mais `null` si l’élément manque (évite de planter toute l’app). */
export const $maybe = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

let toastTimer: number | undefined;
export function hideToast(): void { window.clearTimeout(toastTimer); $('toast').hidden = true; }

export function toast(msg: string, ms = 1800): void {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, ms);
}

/** Dialogue modal maison : focus, Échap, clic hors du panneau, retour du focus. */
export class Modal {
  open = false;
  #last: Element | null = null;
  constructor(readonly overlay: HTMLElement, readonly onClose?: () => void) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    overlay.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (this.open && e.key === 'Escape') { e.preventDefault(); this.close(); } });
  }
  show(focus?: HTMLElement | null): void {
    this.open = true;
    this.#last = document.activeElement;
    this.overlay.hidden = false;
    (focus ?? this.overlay.querySelector<HTMLElement>('button, input'))?.focus();
  }
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.overlay.hidden = true;
    this.onClose?.();
    (this.#last as HTMLElement | null)?.focus?.();
  }
}
