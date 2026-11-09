# Time Circuits — PWA

Les time circuits de la DeLorean en **TypeScript + SCSS**, construits avec **Vite** et installables comme **application web (PWA)**.
Basé sur le projet [kam3leon/time_travel](https://github.com/kam3leon/time_travel).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5175 (accessible depuis le téléphone sur le même réseau)
npm run build      # vérifie les types puis produit dist/
npm run preview    # sert dist/ comme en production (service worker actif)
```

`dist/` se déploie tel quel sur n'importe quel hébergement statique (chemins relatifs, fonctionne aussi dans un sous-dossier).
La PWA demande HTTPS en production (ou `localhost`).

## Ce que fait l'app

- 3 lignes `<time-circuit>` (destination, présent en temps réel, dernier départ), compteur `<set-to-88>`.
- 7 commandes : clavier de saisie, power, voyage, reset, son, thème, réglages. Raccourcis : chiffres + Entrée, X, D, P, R, M, T, O, F (plein écran).
- Voyage : accélération jusqu'à 88 mph (142 km/h en français), musique, flash et éclairs.
- FR / EN : textes, format de date (JJ/MMM/AAAA ou MMM/DD/YYYY) et heure (24 h ou 12 h AM/PM).
- Réglages gardés dans le navigateur : langue, heure, secondes, cadre, rotation des rubans, musique, thème, son.

## Mobile first

- **Smartphone en portrait** : invitation à tourner l'écran. **En paysage** : modules à gauche, compteur et commandes en colonne à droite.
- Clavier de saisie et réglages sur deux colonnes quand l'écran est bas ; cibles tactiles ≥ 44 px ; vibration légère au toucher.
- Plein écran avec verrouillage paysage (réglages), installation de l'app (bouton « Installer » quand le navigateur le propose).
- Hors ligne : tout est mis en cache par le service worker, y compris sons et musique.

## Structure

```
src/
  components/          Web Components réutilisables (Shadow DOM, styles SCSS ?inline)
    palette.ts         couleurs, utilitaires communs
    led-display.ts     afficheur 7 / 16 segments
    led-colon.ts       deux-points clignotants
    led-ampm.ts        voyants AM / PM
    time-circuit.ts    ligne complète (lang, format, secondes, cadre…)
    set-to-88.ts       compteur avec accélération
  app/
    app.ts             contrôleur : power, voyage, reset, son, thème, raccourcis
    keypad.ts          clavier de saisie
    settings.ts        réglages, plein écran, installation
    i18n.ts            traductions fr / en
    audio.ts           bruitages et musique
    lightning.ts       éclairs (canvas)
    digits.ts          lecture des saisies
    storage.ts         réglages enregistrés
    icons.ts, ui.ts    icônes SVG, toast, modales
  styles/              SCSS de l'interface (_tokens, _panel, _buttons, _dialogs…)
public/                polices, sons, fonds, icônes PWA
```

Utiliser les composants ailleurs : `import './components';` puis
`<time-circuit color="red" lang="fr" label="destination" value="1955-11-05T06:00"></time-circuit>`.
Les polices `AlarmClock`, `16Segments` et `JetBrains` sont déclarées dans `src/styles/_fonts.scss`.

## Droits

Les sons et la musique (`public/audios`) viennent du projet d'origine ; `bttf.mp3` est la musique du film.
Vérifiez les droits avant une mise en ligne publique. La police 16Segments est « free for personal use ».
