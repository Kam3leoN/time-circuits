/** Point d'entrée : déclare tous les composants LED. */
export * from './palette';
export { LedDisplay } from './led-display';
export { LedColon } from './led-colon';
export { LedAmPm } from './led-ampm';
export { TimeCircuit, MONTHS_BY_LANG, LABELS_BY_LANG, parseValue, normLang } from './time-circuit';
export type { Lang, DateTimeFields, DateTimePatch } from './time-circuit';
export { SetTo88 } from './set-to-88';
export type { RunOptions } from './set-to-88';
export { NeedleGauge, FluxReset, CapacitorOutput, PlutoniumChamber } from './flux';
