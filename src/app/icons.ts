/** Icônes SVG du projet d'origine, injectées dans les éléments [data-icon]. */
import dialpad from '../assets/icons/dialpad.svg?raw';
import powerOff from '../assets/icons/power-off.svg?raw';
import travel from '../assets/icons/88.svg?raw';
import reset from '../assets/icons/reset.svg?raw';
import volume from '../assets/icons/volume.svg?raw';
import volumeMute from '../assets/icons/volume-mute.svg?raw';
import sun from '../assets/icons/sun.svg?raw';
import moon from '../assets/icons/moon.svg?raw';
import gear from '../assets/icons/gear.svg?raw';
import radiation from '../assets/icons/radiation.svg?raw';
import dmc from '../assets/icons/dmc.svg?raw';
import rotatePhone from '../assets/icons/rotate-phone.svg?raw';
import fullscreen from '../assets/icons/fullscreen.svg?raw';
import install from '../assets/icons/install.svg?raw';

const ICONS: Record<string, string> = {
  dialpad, 'power-off': powerOff, travel, reset, volume, 'volume-mute': volumeMute, sun, moon, gear, radiation, dmc,
  'rotate-phone': rotatePhone, fullscreen, install,
};

export function injectIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon ?? ''] ?? ''; });
}
