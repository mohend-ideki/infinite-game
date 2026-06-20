/**
 * Cœur du système "Marque Blanche".
 *
 * Un client B2B modifie ce seul fichier pour rebrander entièrement le jeu :
 * palette, ressenti physique et économie de score. Aucun autre fichier
 * ne contient de valeur de marque codée en dur.
 *
 * Plusieurs thèmes prêts à l'emploi sont fournis dans `themePresets`. Le
 * client peut soit définir `DEFAULT_THEME_ID`, soit injecter sa propre marque
 * dans un nouveau preset.
 */

export interface ThemeColors {
  /** Couleur principale : sphère du joueur, accents forts de l'UI. */
  primary: string;
  /** Couleur secondaire : bonus rares, éléments de mise en avant. */
  secondary: string;
  /** Couleur d'accent : bonus communs, lumières d'ambiance. */
  accent: string;
  /** Couleur de fond : ciel, sol, brouillard. */
  background: string;
}

export interface PhysicsConfig {
  /** Vitesse d'avance initiale du joueur sur l'axe Z (unités/s). */
  baseSpeed: number;
  /** Gain de vitesse appliqué par unité de distance parcourue. */
  accelerationRate: number;
  /** Intensité de la gravité du monde (m/s²), positive. */
  gravity: number;
}

export interface ScoringConfig {
  /** Points de base accordés par un bonus commun (avant multiplicateur). */
  basePoints: number;
  /** Base du multiplicateur de combo exponentiel (> 1). */
  comboMultiplierBase: number;
}

export interface SponsorConfig {
  /** Logo sponsor en base64 ou URL (bannière menu + écran de fin). */
  logoUrl?: string;
  /** Lien ouvert au clic sur la bannière. */
  link?: string;
  /** Active l'écran interstitiel entre deux parties. */
  interstitial?: boolean;
  /** Délai (ms) avant que "Continuer" devienne actif sur l'interstitiel. */
  interstitialDelay?: number;
}

export interface ThemePreset {
  /** Identifiant stable du thème (persisté). */
  id: string;
  /** Nom de marque affiché dans les écrans d'UI. */
  brandName: string;
  /** Accroche affichée sous le titre dans le menu. */
  tagline: string;
  colors: ThemeColors;
  physics: PhysicsConfig;
  scoring: ScoringConfig;
  /** Logo de marque (base64/URL) affiché à la place du titre si présent. */
  logoUrl?: string;
  /** Crochets de sponsoring optionnels. */
  sponsor?: SponsorConfig;
}

export type ThemeConfig = ThemePreset;

/** Catalogue de thèmes livrés (démonstration de la valeur white-label). */
export const themePresets: ThemePreset[] = [
  {
    id: "nova",
    brandName: "NOVA RUNNER",
    tagline: "Pilote la sphère énergétique. Enchaîne les combos. Va plus loin.",
    colors: {
      primary: "#22d3ee",
      secondary: "#f5b700",
      accent: "#a855f7",
      background: "#05060a",
    },
    physics: { baseSpeed: 14, accelerationRate: 0.018, gravity: 9.81 },
    scoring: { basePoints: 10, comboMultiplierBase: 1.6 },
  },
  {
    id: "ember",
    brandName: "EMBER RUSH",
    tagline: "Traverse le couloir incandescent. Ne laisse rien te ralentir.",
    colors: {
      primary: "#ff7a18",
      secondary: "#ffd60a",
      accent: "#ff2d55",
      background: "#0c0604",
    },
    physics: { baseSpeed: 16, accelerationRate: 0.022, gravity: 9.81 },
    scoring: { basePoints: 12, comboMultiplierBase: 1.7 },
  },
  {
    id: "mint",
    brandName: "MINT DRIVE",
    tagline: "Une course fluide et lumineuse. Garde la cadence.",
    colors: {
      primary: "#34d399",
      secondary: "#fde047",
      accent: "#38bdf8",
      background: "#04100c",
    },
    physics: { baseSpeed: 13, accelerationRate: 0.016, gravity: 9.81 },
    scoring: { basePoints: 10, comboMultiplierBase: 1.55 },
  },
  {
    id: "rose",
    brandName: "ROSE VELOCITY",
    tagline: "Élégance et vitesse. Chaque combo compte.",
    colors: {
      primary: "#fb7185",
      secondary: "#f0abfc",
      accent: "#c084fc",
      background: "#0b0410",
    },
    physics: { baseSpeed: 15, accelerationRate: 0.02, gravity: 9.81 },
    scoring: { basePoints: 11, comboMultiplierBase: 1.65 },
  },
];

export const DEFAULT_THEME_ID = "nova";

function findPreset(id: string): ThemePreset {
  return themePresets.find((preset) => preset.id === id) ?? themePresets[0];
}

/**
 * Thème actif. Objet muté en place par `applyThemePreset` : toutes les
 * références importées (`themeConfig.colors.primary`, etc.) voient le nouveau
 * thème dès le rendu suivant.
 */
export const themeConfig: ThemeConfig = { ...findPreset(DEFAULT_THEME_ID) };

export function applyThemePreset(id: string): void {
  applyThemeValues(findPreset(id));
}

/** Applique un thème arbitraire (objet complet) sur le thème actif, en place. */
export function applyThemeValues(theme: ThemePreset): void {
  themeConfig.id = theme.id;
  themeConfig.brandName = theme.brandName;
  themeConfig.tagline = theme.tagline;
  themeConfig.colors = { ...theme.colors };
  themeConfig.physics = { ...theme.physics };
  themeConfig.scoring = { ...theme.scoring };
  themeConfig.logoUrl = theme.logoUrl;
  themeConfig.sponsor = theme.sponsor ? { ...theme.sponsor } : undefined;
}

/** Copie profonde d'un thème (pour éditer sans muter les presets livrés). */
export function cloneTheme(theme: ThemePreset): ThemePreset {
  return {
    id: theme.id,
    brandName: theme.brandName,
    tagline: theme.tagline,
    colors: { ...theme.colors },
    physics: { ...theme.physics },
    scoring: { ...theme.scoring },
    logoUrl: theme.logoUrl,
    sponsor: theme.sponsor ? { ...theme.sponsor } : undefined,
  };
}
