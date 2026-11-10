/**
 * Voyage temporel : écran noir + éclairs (public/assets/fx/lightning.gif), comme le projet d'origine.
 * Le GIF est chargé une fois en mémoire ; chaque voyage lui donne une nouvelle URL (blob) pour que
 * l'animation reparte du début, y compris hors ligne.
 */
import { $ } from './ui';

const GIF_URL = `${import.meta.env.BASE_URL}assets/fx/lightning.gif`;
let gif: Promise<Blob | null> | null = null;

/** Précharge le GIF (appelé au démarrage, sans bloquer). */
export function preloadWarp(): void {
  gif ??= fetch(GIF_URL).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
}

/** Affiche l'écran noir + éclairs pendant `duration` ms. */
export async function warp(duration = 2000): Promise<void> {
  preloadWarp();
  const blob = await gif;
  const overlay = $('warp');
  const img = $<HTMLImageElement>('warpGif');
  const url = blob ? URL.createObjectURL(blob) : `${GIF_URL}?t=${Date.now()}`;
  img.src = url;
  overlay.classList.remove('out');
  overlay.hidden = false;
  await new Promise((r) => setTimeout(r, duration));
  overlay.classList.add('out');
  await new Promise((r) => setTimeout(r, 250));
  overlay.hidden = true;
  img.removeAttribute('src');
  if (blob) URL.revokeObjectURL(url);
}
