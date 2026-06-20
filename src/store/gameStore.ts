import { useSyncExternalStore } from "react";
import * as THREE from "three";
import {
  applyThemePreset,
  applyThemeValues,
  cloneTheme,
  DEFAULT_THEME_ID,
  themeConfig,
  type ThemePreset,
} from "../config/themeConfig";
import { sound } from "../audio/sound";
import { loadJSON, saveJSON } from "./persistence";

export type GamePhase =
  | "menu"
  | "countdown"
  | "playing"
  | "paused"
  | "gameover"
  | "interstitial";
export type PowerupType = "shield" | "magnet" | "slowmo";

export interface GameSettings {
  sfx: boolean;
  music: boolean;
  reducedMotion: boolean;
}

export interface PowerupState {
  /** Bouclier disponible : absorbe le prochain malus. */
  shield: boolean;
  /** Timestamp (ms) jusqu'auquel l'aimant attire les bonus. */
  magnetUntil: number;
  /** Timestamp (ms) jusqu'auquel le temps est ralenti. */
  slowmoUntil: number;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  combo: number;
  multiplier: number;
  health: number;
  bestScore: number;
  finalDistance: number;
  themeId: string;
  /** Compteur bumpé à chaque édition live du thème (re-render sans remontage). */
  themeRevision: number;
  settings: GameSettings;
  powerups: PowerupState;
  leaderboard: number[];
  runId: number;
}

export const MAX_HEALTH = 100;
const MALUS_DAMAGE = 34;
const MAX_COMBO_EXPONENT = 15;

export const MAGNET_DURATION_MS = 7000;
export const SLOWMO_DURATION_MS = 5000;
const LEADERBOARD_SIZE = 5;

const BEST_KEY = "ibr.best";
const SETTINGS_KEY = "ibr.settings";
const THEME_KEY = "ibr.theme";
const LEADERBOARD_KEY = "ibr.leaderboard";
const CUSTOM_THEME_KEY = "ibr.customTheme";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function emptyPowerups(): PowerupState {
  return { shield: false, magnetUntil: 0, slowmoUntil: 0 };
}

const initialSettings = loadJSON<GameSettings>(SETTINGS_KEY, {
  sfx: true,
  music: true,
  reducedMotion: prefersReducedMotion(),
});

const initialThemeId = loadJSON<string>(THEME_KEY, DEFAULT_THEME_ID);
applyThemePreset(initialThemeId);
const customTheme = loadJSON<ThemePreset | null>(CUSTOM_THEME_KEY, null);
if (customTheme) {
  applyThemeValues(customTheme);
}
sound.setSfxEnabled(initialSettings.sfx);
sound.setMusicEnabled(initialSettings.music);

let state: GameState = {
  phase: "menu",
  score: 0,
  combo: 0,
  multiplier: 1,
  health: MAX_HEALTH,
  bestScore: loadJSON<number>(BEST_KEY, 0),
  finalDistance: 0,
  themeId: themeConfig.id,
  themeRevision: 0,
  settings: initialSettings,
  powerups: emptyPowerups(),
  leaderboard: loadJSON<number[]>(LEADERBOARD_KEY, []),
  runId: 0,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<GameState>): void {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Position du joueur partagée entre composants 3D (caméra, générateur de monde)
 * SANS déclencher de rendu React. Mise à jour chaque frame par <Player />.
 */
export const playerPosition = new THREE.Vector3(0, 1, 0);

function computeMultiplier(combo: number): number {
  const exponent = Math.min(Math.max(combo - 1, 0), MAX_COMBO_EXPONENT);
  return Math.pow(themeConfig.scoring.comboMultiplierBase, exponent);
}

export function getGameState(): GameState {
  return state;
}

/** Copie éditable du thème actif (pour initialiser le Studio). */
export function getCurrentTheme(): ThemePreset {
  return cloneTheme(themeConfig);
}

export function isMagnetActive(): boolean {
  return state.powerups.magnetUntil > performance.now();
}

export function isSlowmoActive(): boolean {
  return state.powerups.slowmoUntil > performance.now();
}

export const gameActions = {
  startGame(): void {
    sound.init();
    if (state.settings.music) {
      sound.startMusic();
    }
    playerPosition.set(0, 1, 0);
    setState({
      phase: "countdown",
      score: 0,
      combo: 0,
      multiplier: 1,
      health: MAX_HEALTH,
      finalDistance: 0,
      powerups: emptyPowerups(),
      runId: state.runId + 1,
    });
  },

  beginPlay(): void {
    if (state.phase === "countdown") {
      setState({ phase: "playing" });
    }
  },

  togglePause(): void {
    if (state.phase === "playing") {
      setState({ phase: "paused" });
    } else if (state.phase === "paused") {
      setState({ phase: "playing" });
    }
  },

  pause(): void {
    if (state.phase === "playing") {
      setState({ phase: "paused" });
    }
  },

  collectBonus(value: number): void {
    if (state.phase !== "playing") {
      return;
    }
    const combo = state.combo + 1;
    const multiplier = computeMultiplier(combo);
    const gained = Math.round(themeConfig.scoring.basePoints * value * multiplier);
    setState({ combo, multiplier, score: state.score + gained });
  },

  activatePowerup(type: PowerupType): void {
    if (state.phase !== "playing") {
      return;
    }
    const now = performance.now();
    if (type === "shield") {
      setState({ powerups: { ...state.powerups, shield: true } });
    } else if (type === "magnet") {
      setState({
        powerups: { ...state.powerups, magnetUntil: now + MAGNET_DURATION_MS },
      });
    } else {
      setState({
        powerups: { ...state.powerups, slowmoUntil: now + SLOWMO_DURATION_MS },
      });
    }
  },

  hitMalus(): boolean {
    if (state.phase !== "playing") {
      return false;
    }
    if (state.powerups.shield) {
      setState({ powerups: { ...state.powerups, shield: false } });
      return true; // malus absorbé par le bouclier
    }
    const health = state.health - MALUS_DAMAGE;
    if (health <= 0) {
      gameActions.endGame();
      return false;
    }
    setState({ health, combo: 0, multiplier: 1 });
    return false;
  },

  endGame(): void {
    if (state.phase !== "playing" && state.phase !== "countdown") {
      return;
    }
    sound.stopMusic();
    sound.gameOver();
    const bestScore = Math.max(state.bestScore, state.score);
    const leaderboard = [...state.leaderboard, state.score]
      .sort((a, b) => b - a)
      .slice(0, LEADERBOARD_SIZE);
    if (bestScore !== state.bestScore) {
      saveJSON(BEST_KEY, bestScore);
    }
    saveJSON(LEADERBOARD_KEY, leaderboard);
    setState({
      phase: "gameover",
      health: 0,
      combo: 0,
      multiplier: 1,
      bestScore,
      leaderboard,
      finalDistance: Math.max(0, Math.floor(playerPosition.z)),
    });
  },

  returnToMenu(): void {
    sound.stopMusic();
    setState({ phase: "menu" });
  },

  setSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    const settings = { ...state.settings, [key]: value };
    saveJSON(SETTINGS_KEY, settings);
    if (key === "sfx") {
      sound.setSfxEnabled(value as boolean);
    } else if (key === "music") {
      sound.setMusicEnabled(value as boolean);
      if (value && (state.phase === "playing" || state.phase === "countdown")) {
        sound.startMusic();
      }
    }
    setState({ settings });
  },

  setTheme(id: string): void {
    applyThemePreset(id);
    saveJSON(THEME_KEY, id);
    setState({ themeId: themeConfig.id, themeRevision: state.themeRevision + 1 });
  },

  /** Aperçu live du Studio : applique un thème arbitraire et persiste le brouillon. */
  applyLiveTheme(theme: ThemePreset): void {
    applyThemeValues(theme);
    saveJSON(CUSTOM_THEME_KEY, theme);
    setState({ themeId: themeConfig.id, themeRevision: state.themeRevision + 1 });
  },

  /** Réinitialise le thème personnalisé et revient à un preset livré. */
  resetCustomTheme(id: string): void {
    applyThemePreset(id);
    saveJSON(CUSTOM_THEME_KEY, null);
    saveJSON(THEME_KEY, id);
    setState({ themeId: themeConfig.id, themeRevision: state.themeRevision + 1 });
  },

  /** Rejouer depuis l'écran de fin : passe par l'interstitiel sponsor si activé. */
  requestReplay(): void {
    if (themeConfig.sponsor?.interstitial && themeConfig.sponsor.logoUrl) {
      setState({ phase: "interstitial" });
    } else {
      gameActions.startGame();
    }
  },
};

/** Sélecteur typé : ne re-rend que lorsque la valeur sélectionnée change. */
export function useGameSelector<T>(selector: (snapshot: GameState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}
