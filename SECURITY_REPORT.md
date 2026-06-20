# Rapport de securite - Infinite Brand Runner

Date: 2026-06-20  
Projet local: `C:\Users\mohen\Downloads\jeux\infinite-brand-runner`  
Depot GitHub: `https://github.com/mohend-ideki/infinite-game.git`

## Resume

Statut actuel: OK pour deploiement.

- `npm audit --audit-level=moderate`: 0 vulnerabilite trouvee
- `npm run typecheck`: OK
- `npm run build`: OK
- Configuration Vercel: Vite, build `npm run build`, sortie `dist`

## Probleme initial

Le depot GitHub ne contenait plus que `README.md`. Vercel ne recevait donc pas le vrai projet Vite/React et pouvait afficher une erreur 404.

Le projet complet a ete restaure depuis `infinite-brand-runner.zip`, puis pousse sur la branche `main`.

## Audit avant correction

`npm audit` a detecte 2 problemes:

- `vite`: severite high
- `esbuild` via `vite`: severite moderate

Ces alertes concernaient surtout le serveur de developpement Vite. Elles ne signifiaient pas que les fichiers statiques `dist` exposaient directement ces failles, mais elles devaient etre corrigees pour garder la chaine de build propre.

Advisories signalees par npm:

- `GHSA-4w7w-66w2-5vf9`
- `GHSA-v6wh-96g9-6wx3`
- `GHSA-fx2h-pf6j-xcff`
- `GHSA-67mh-4wv8-2f99`

## Corrections appliquees

- Mise a jour de `vite` vers `^8.0.16`
- Mise a jour de `@vitejs/plugin-react` vers `^6.0.2`
- Ajout de `engines.node` pour aider Vercel a utiliser une version Node compatible avec Vite 8
- Adaptation de `vite.config.ts` pour Vite 8 / Rolldown:
  - `manualChunks` est maintenant une fonction au lieu d'un objet
- Verification finale avec audit, typecheck et build

## Commandes de verification

```powershell
npm.cmd audit --audit-level=moderate
npm.cmd run typecheck
npm.cmd run build
git status --short --branch
```

Resultats:

```text
found 0 vulnerabilities
typecheck OK
build OK
main synchronise avec origin/main apres push
```

## Reglages Vercel recommandes

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## Notes de securite

- Aucun secret, token ou mot de passe n'a ete ajoute au depot.
- `node_modules`, `dist`, `.env` et fichiers locaux sont ignores par `.gitignore`.
- Le projet est une application front-end statique; les risques serveur sont limites au pipeline de build et au serveur local de developpement.
- Il faut relancer `npm audit` apres chaque ajout de dependance.
