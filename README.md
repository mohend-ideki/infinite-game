# Infinite Brand Runner — moteur de jeu 3D "Marque Blanche"

Jeu 3D web infini prêt à être revendu et rebrandé par un client B2B. Sphère
énergétique sur piste 3D infinie, combos exponentiels, objets rares dont la
probabilité d'apparition croît avec la distance.

## Pourquoi ce produit a de la valeur

- **Zéro asset à licencier.** Sons (Web Audio) et géométrie (Three.js) sont
  100% procéduraux. Pas de samples ni de modèles à acheter, pas de droits à
  gérer, bundle plus léger — le client possède un produit entièrement clean.
- **Rebranding en 1 minute.** Toute l'identité (palette, marque, physique,
  scoring) tient dans `src/config/themeConfig.ts`. 4 thèmes prêts à l'emploi
  sont livrés en démonstration.
- **Mobile + desktop.** Contrôles clavier et tactiles, retour haptique,
  responsive, mode « animations réduites » pour l'accessibilité.
- **Game feel premium.** Bloom, particules instanciées, secousse de caméra,
  punch de FOV, traînée d'énergie, champ d'étoiles, suivi caméra interpolé.
- **Persistance.** Meilleur score, classement local top-5 et réglages conservés.
- **Code TypeScript strict, build Netlify prêt.**

## Gameplay

- **Combos exponentiels** : chaque bonus consécutif augmente un multiplicateur
  `comboMultiplierBase ^ combo`. Un malus le remet à zéro.
- **Objets rares** : probabilité d'apparition croissante avec la distance.
- **Courbe de difficulté** : densité d'objets et proportion de malus montent
  progressivement.
- **Power-ups** : bouclier (absorbe un malus), aimant (attire les bonus),
  ralenti (réduit la vitesse). Indicateurs et minuteurs dans le HUD.
- **Énergie** : 3 impacts de malus mettent fin à la partie (sauf bouclier).
- **Classement local** : les 5 meilleurs scores sont conservés et affichés.

## Stack

React + Vite · TypeScript (strict) · Tailwind CSS · `@react-three/fiber` ·
`three` · `@react-three/drei` · `@react-three/rapier` (physique) ·
`@react-three/postprocessing` (bloom). Audio : Web Audio API natif.

## Lancer

```bash
npm install
npm run dev      # développement local
npm run build    # build de production (dossier dist/)
npm run preview  # prévisualiser le build
npm run typecheck
```

## Studio de marque (white-label sans code)

Un éditeur de thème temps réel destiné à un client B2B non-technique. Le joueur
final ne le voit jamais.

- Accès : URL `?studio=1`, ou appui long (1,5 s) sur le titre du menu.
- Édite en direct : nom de marque, accroche, logo, 4 couleurs, physique et
  scoring (sliders) — la scène 3D et l'UI se mettent à jour instantanément.
- Crochets sponsor : logo + lien (bannière menu et écran de fin), et écran
  interstitiel optionnel entre deux parties (délai « Continuer » paramétrable).
- Export : `theme.json` téléchargeable, fichier `.ts` prêt à coller, et code
  copiable. Import d'un `theme.json` existant.
- Le thème édité est persisté en local et rechargé au démarrage, sans jamais
  écraser les presets livrés.

## Rebrander

Deux voies au choix :
1. Studio de marque (ci-dessus), puis « Exporter » → coller le bloc dans
   `themePresets` de `src/config/themeConfig.ts`.
2. Édition directe de `src/config/themeConfig.ts` :

- `themePresets` : catalogue de thèmes (un client peut n'en garder qu'un).
- `DEFAULT_THEME_ID` : thème appliqué par défaut.
- Par thème : `colors` (primary, secondary, accent, background),
  `physics` (baseSpeed, accelerationRate, gravity),
  `scoring` (basePoints, comboMultiplierBase), `brandName`, `tagline`.

## Déploiement

IMPORTANT : déploie depuis le dossier qui contient `package.json` (la racine de
ce projet). Si tu pousses un dépôt où ce projet est dans un sous-dossier, règle
le « Root Directory » de l'hébergeur sur ce sous-dossier — sinon tu obtiens un
404 (framework non détecté).

Vercel : `vercel.json` est inclus (framework Vite, sortie `dist`, réécritures
SPA). Importe le dépôt, laisse les réglages par défaut, déploie.

Netlify : `netlify.toml` + `public/_redirects` inclus (build `npm run build`,
publication `dist`, fallback SPA). Branche le dépôt et c'est en ligne.

Build local équivalent :

```bash
npm install
npm run build   # produit dist/
```

## Contrôles

- Clavier : `←` / `→` (ou `A` / `D`, et `Q` pour AZERTY).
- Mobile : touche la moitié gauche ou droite de l'écran.

## Architecture

```
src/
  config/themeConfig.ts      Configuration white-label + presets
  store/gameStore.ts         État global (useSyncExternalStore), réglages, scores
  store/persistence.ts       localStorage protégé
  audio/sound.ts             Moteur audio procédural (SFX + musique)
  effects/effectsBus.ts      Bus d'effets transitoires + haptique
  components/scene/          Canvas, joueur, génération de monde, effets
  components/ui/Overlay.tsx  HUD temps réel
  App.tsx                    State machine + écrans UI
```

---

Made by Mohand Idiki · @moh_end_267
