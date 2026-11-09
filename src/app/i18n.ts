/** Traductions de l'interface (fr / en). Toutes les clés existent dans les deux langues. */
import type { Lang } from '../components';

const fr = {
  appTitle: 'Time Circuits',
  navAria: 'Commandes',
  bDate: 'clavier', bPower: 'power', bTravel: 'voyage', bReset: 'reset', bMute: 'son', bTheme: 'thème', bFullscreen: 'écran', bOptions: 'options',
  tDate: 'Clavier de saisie (D)', tPower: 'Time circuits on / off (P)', tTravel: 'Voyager (X)', tReset: 'Reset (R)',
  tMute: 'Couper / remettre le son (M)', tTheme: 'Thème du panneau (T)', tFullscreen: 'Plein écran (F)', tOptions: 'Réglages (O)',
  kpTitle: 'Saisie de date', close: 'Fermer', now: 'MAINTENANT', modesAria: 'Ligne à régler',
  mDest: 'Destination', mPres: 'Présent', mDep: 'Départ',
  kClear: 'EFFACER', kEnter: 'VALIDER', kBack: 'Effacer le dernier chiffre',
  max12: '12 chiffres maximum', nowMsg: 'Date et heure actuelles',
  set: (m: string) => `Ligne ${m.toLowerCase()} réglée`, needPower: "Allumez d'abord les time circuits (POWER)",
  tcLabels: 'MOIS,JOUR,ANNÉE,HEURE,MIN,SEC', ampm: 'AM,PM',
  fDest: 'destination', fPres: 'temps présent', fDep: 'dernier départ',
  speedTarget: 142, speedLabels: 'RÉGLER,À,142', speedUnit: 'KM/H', speedTitle: '88 mph = 142 km/h',
  clock: 24 as 12 | 24,
  opTitle: 'Réglages', oLang: 'Langue · format de date', oFmt: 'Heure', oSec: 'Secondes', oFrame: 'Cadre des modules',
  oRot: 'Rotation des rubans', oMusic: 'Musique pendant le voyage', oApp: 'Application',
  yes: 'oui', no: 'non', none: 'aucun', frame: 'cadre', granite: 'granit',
  fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran', install: "Installer l'app", installed: 'App installée',
  rotate: 'Tournez votre téléphone en mode paysage pour afficher les time circuits.',
  hello: 'Appuyez sur POWER pour démarrer les time circuits.',
  offline: 'Prêt à fonctionner hors ligne', updated: 'Nouvelle version installée',
  arrived: (d: string) => `Arrivée : ${d}`,
  errors: {
    '* INVALID * MONTH': '* MOIS * INVALIDE', '* INVALID * DAY': '* JOUR * INVALIDE', '* INVALID * HOUR': '* HEURE * INVALIDE',
    '* INVALID * MINUTE': '* MINUTE * INVALIDE', '* INVALID * INPUT': '* SAISIE * INVALIDE', '* INCOMPLETE * INPUT': '* SAISIE * INCOMPLETE',
    '* EMPTY * INPUT': '* SAISIE * VIDE', '* POWER * OFF': '* CIRCUITS * ETEINTS', '* SET * DESTINATION': '* DESTINATION * A REGLER',
  } as Record<string, string>,
};

export type Dict = typeof fr;

const en: Dict = {
  appTitle: 'Time Circuits',
  navAria: 'Controls',
  bDate: 'keypad', bPower: 'power', bTravel: 'travel', bReset: 'reset', bMute: 'sound', bTheme: 'theme', bFullscreen: 'screen', bOptions: 'settings',
  tDate: 'Keypad (D)', tPower: 'Time circuits on / off (P)', tTravel: 'Travel (X)', tReset: 'Reset (R)',
  tMute: 'Mute / unmute (M)', tTheme: 'Panel theme (T)', tFullscreen: 'Full screen (F)', tOptions: 'Settings (O)',
  kpTitle: 'Date entry', close: 'Close', now: 'NOW', modesAria: 'Row to set',
  mDest: 'Destination', mPres: 'Present', mDep: 'Departed',
  kClear: 'CLEAR', kEnter: 'ENTER', kBack: 'Delete last digit',
  max12: '12 digits maximum', nowMsg: 'Current date and time',
  set: (m: string) => `${m} set`, needPower: 'Turn the time circuits on first (POWER)',
  tcLabels: 'MONTH,DAY,YEAR,HOUR,MIN,SEC', ampm: 'AM,PM',
  fDest: 'destination time', fPres: 'present time', fDep: 'last time departed',
  speedTarget: 88, speedLabels: 'SET,TO,88', speedUnit: 'MPH', speedTitle: '88 mph',
  clock: 12,
  opTitle: 'Settings', oLang: 'Language · date format', oFmt: 'Clock', oSec: 'Seconds', oFrame: 'Module frame',
  oRot: 'Label rotation', oMusic: 'Music while travelling', oApp: 'App',
  yes: 'on', no: 'off', none: 'none', frame: 'frame', granite: 'granite',
  fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', install: 'Install the app', installed: 'App installed',
  rotate: 'Turn your phone to landscape to show the time circuits.',
  hello: 'Press POWER to start the time circuits.',
  offline: 'Ready to work offline', updated: 'New version installed',
  arrived: (d: string) => `Arrived: ${d}`,
  errors: {},
};

const DICTS: Record<Lang, Dict> = { fr, en };

let current: Lang = 'fr';
export const getLang = (): Lang => current;
export const setLang = (l: Lang): void => { current = l; document.documentElement.lang = l; };
export const dict = (): Dict => DICTS[current];

type StringKey = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];
export const t = (k: StringKey): string => DICTS[current][k];
/** Messages d'erreur internes (codes anglais) → langue courante. */
export const tErr = (code: string): string => DICTS[current].errors[code] ?? code;

/** Applique les textes statiques : data-i18n (texte), data-i18n-title (title + aria-label), data-i18n-aria. */
export function applyStatic(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n as StringKey); });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const v = t(el.dataset.i18nTitle as StringKey);
    el.title = v; el.setAttribute('aria-label', v);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria as StringKey)));
}
