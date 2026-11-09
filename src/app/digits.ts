/** Lecture d'une saisie de 2 à 12 chiffres dans l'ordre de la langue du circuit. */
import type { DateTimePatch, TimeCircuit } from '../components';

export interface DigitsResult { patch: DateTimePatch; error?: string }

const two = (n: number) => String(n).padStart(2, '0');

/**
 * en : MM DD YYYY HH mm · fr : JJ MM AAAA HH mm (heure saisie sur 24 h).
 * partial : la destination accepte 2, 4, 8, 10 ou 12 chiffres ; sinon 12 obligatoires.
 */
export function readDigits(d: string, circuit: TimeCircuit, partial: boolean): DigitsResult {
  const fr = circuit.lang === 'fr';
  const n = (a: number) => parseInt(d.slice(a, a + 2), 10);
  const patch: DateTimePatch = {};
  const day = (v: number) => (v < 1 || v > 31 ? '* INVALID * DAY' : ((patch.day = two(v)), ''));
  const month = (v: number) => (v < 1 || v > 12 ? '* INVALID * MONTH' : ((patch.month = v), ''));
  if (d.length >= 2) { const e = fr ? day(n(0)) : month(n(0)); if (e) return { patch, error: e }; }
  if (d.length >= 4) { const e = fr ? month(n(2)) : day(n(2)); if (e) return { patch, error: e }; }
  if (d.length >= 8) patch.year = d.slice(4, 8);
  if (d.length >= 10) {
    const h = n(8);
    if (h > 23) return { patch, error: '* INVALID * HOUR' };
    patch.hour = circuit.format === 24 ? two(h) : two(h % 12 || 12);
    patch.isAM = h < 12;
  }
  if (d.length >= 12) {
    const m = n(10);
    if (m > 59) return { patch, error: '* INVALID * MINUTE' };
    patch.minute = two(m);
    patch.second = '00';
  }
  if (!partial && d.length < 12) return { patch, error: '* INCOMPLETE * INPUT' };
  if (partial && (d.length % 2 || d.length === 6)) return { patch, error: '* INVALID * INPUT' };
  return { patch };
}

export { two };
