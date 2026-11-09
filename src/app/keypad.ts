/** Clavier de saisie : onglets de ligne, aperçu LED, guide de format, touches 4 colonnes. */
import type { TimeCircuit } from '../components';
import { haptic, type AudioManager } from './audio';
import { readDigits, two } from './digits';
import { dict, t, tErr } from './i18n';
import { $, Modal, toast } from './ui';

export type Mode = 'destination' | 'present' | 'departed';
const MODES: Mode[] = ['destination', 'present', 'departed'];
const MODE_COLOR: Record<Mode, string> = { destination: 'red', present: 'green', departed: 'amber' };
const MODE_KEY = { destination: 'mDest', present: 'mPres', departed: 'mDep' } as const;

export class Keypad {
  readonly modal: Modal;
  mode: Mode = 'destination';
  input = '';
  readonly #preview = $<TimeCircuit>('kpPreview');

  constructor(
    private readonly circuits: Record<Mode, TimeCircuit>,
    private readonly audio: AudioManager,
    private readonly apply: (mode: Mode, digits: string) => boolean,
    onClose: () => void,
  ) {
    this.modal = new Modal($('kp'), onClose);
    document.querySelectorAll<HTMLButtonElement>('#kp [data-key]').forEach((b) => b.addEventListener('click', () => this.press(b.dataset.key!)));
    document.querySelectorAll<HTMLButtonElement>('.kp-modes button').forEach((b) =>
      b.addEventListener('click', () => { this.setMode(b.dataset.mode as Mode); this.audio.play('button'); }));
    document.addEventListener('keydown', (e) => this.#onKey(e));
  }

  get isOpen(): boolean { return this.modal.open; }

  open(mode: Mode = 'destination'): void {
    this.setMode(mode);
    this.modal.show(document.querySelector<HTMLElement>(`.kp-modes [data-mode="${mode}"]`));
    this.audio.play('button');
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.input = '';
    document.querySelectorAll('.kp-modes button').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.mode === mode)));
    this.#preview.color = MODE_COLOR[mode];
    this.render();
  }

  /** Re-traduit les onglets et rafraîchit l'aperçu (changement de langue). */
  relabel(): void {
    document.querySelectorAll<HTMLElement>('.kp-modes button').forEach((b) => { b.textContent = t(MODE_KEY[b.dataset.mode as Mode]); });
    document.querySelector('.kp-modes')?.setAttribute('aria-label', t('modesAria'));
    if (this.isOpen) this.render();
  }

  render(msg = '', cls = ''): void {
    const c = this.circuits[this.mode];
    const fr = c.lang === 'fr';
    for (const a of ['lang', 'format', 'labels', 'ampm-labels'] as const) {
      const v = c.getAttribute(a);
      if (v !== null) this.#preview.setAttribute(a, v);
    }
    this.#preview.toggleAttribute('seconds', c.hasAttribute('seconds'));
    this.#preview.update(c.getDateTime());
    const d = this.input;
    if (d.length) {
      const blank = { month: '   ', day: '  ', year: '    ', hour: '  ', minute: '  ', second: '  ' };
      this.#preview.update({ ...blank, ...readDigits(d, c, true).patch });
    }
    // Guide de format avec curseur.
    let i = 0, html = '';
    for (const ch of (fr ? 'JJ/MM/AAAA HH:MM' : 'MM/DD/YYYY HH:MM')) {
      if (/[/: ]/.test(ch)) { html += `<span class="sep">${ch === ' ' ? '&nbsp;' : ch}</span>`; continue; }
      html += i < d.length ? `<span class="d">${d[i]}</span>` : `<span class="${i === d.length ? 'next' : ''}">${ch}</span>`;
      i++;
    }
    $('kpMask').innerHTML = html;
    const m = $('kpMsg');
    m.className = `kp-msg ${cls}`;
    m.textContent = msg ? tErr(msg) : '';
  }

  press(key: string): void {
    const btn = document.querySelector(`#kp [data-key="${key}"]`);
    if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); }
    haptic();
    const c = this.circuits[this.mode];
    if (/^\d$/.test(key)) {
      if (this.input.length >= 12) { this.audio.play('error'); this.render(t('max12'), 'err'); return; }
      this.input += key;
      this.audio.dial(key);
      const { error } = readDigits(this.input, c, true);
      const blocking = !!error && !/INPUT$/.test(error);
      this.render(blocking ? error : '', blocking ? 'err' : '');
      if (blocking) this.audio.play('error');
    } else if (key === 'backspace') {
      if (!this.input) { this.audio.play('error'); return; }
      this.input = this.input.slice(0, -1);
      this.audio.dial(1);
      this.render();
    } else if (key === 'clear') {
      this.input = '';
      this.audio.play('button');
      this.render();
    } else if (key === 'now') {
      const n = new Date();
      const first = c.lang === 'fr' ? [n.getDate(), n.getMonth() + 1] : [n.getMonth() + 1, n.getDate()];
      this.input = first.map(two).join('') + n.getFullYear() + two(n.getHours()) + two(n.getMinutes());
      this.audio.play('button');
      this.render(t('nowMsg'), 'ok');
    } else if (key === 'enter') {
      const { error } = readDigits(this.input, c, this.mode === 'destination');
      if (!this.input || error) { this.audio.play('error'); this.render(error ?? '* EMPTY * INPUT', 'err'); return; }
      if (this.apply(this.mode, this.input)) {
        this.audio.play('button');
        toast(dict().set(t(MODE_KEY[this.mode])));
        this.modal.close();
      }
    }
  }

  #onKey(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    const k = e.key;
    if (k >= '0' && k <= '9') { e.preventDefault(); this.press(k); }
    else if (k === 'Enter' && !(e.target as HTMLElement).closest?.('[data-close]')) { e.preventDefault(); this.press('enter'); }
    else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); this.press('backspace'); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const next = MODES[(MODES.indexOf(this.mode) + (k === 'ArrowRight' ? 1 : 2)) % 3];
      this.setMode(next);
      this.audio.play('button');
      document.querySelector<HTMLElement>(`.kp-modes [data-mode="${next}"]`)?.focus();
    } else if (/^[nN]$/.test(k)) this.press('now');
  }
}
