import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GameScene } from "./components/scene/GameScene";
import { Overlay } from "./components/ui/Overlay";
import { BrandStudio } from "./components/studio/BrandStudio";
import { SponsorBanner } from "./components/ui/SponsorBanner";
import { sound } from "./audio/sound";
import { themeConfig, themePresets } from "./config/themeConfig";
import {
  gameActions,
  useGameSelector,
  type GameSettings,
} from "./store/gameStore";

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const style: CSSProperties = {
    background: themeConfig.colors.primary,
    boxShadow: `0 0 32px ${themeConfig.colors.primary}80`,
  };
  return (
    <button
      type="button"
      onClick={() => {
        sound.init();
        sound.uiClick();
        onClick();
      }}
      style={style}
      className="pointer-events-auto rounded-2xl px-10 py-4 font-display text-lg font-bold uppercase tracking-[0.18em] text-black transition active:scale-95"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.uiClick();
        onClick();
      }}
      className="pointer-events-auto rounded-2xl border border-white/25 px-8 py-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10 active:scale-95"
    >
      {children}
    </button>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-7 rounded-3xl bg-black/55 p-9 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

function Legend({ color, label, hint }: { color: string; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="h-4 w-4 rounded-sm"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
      />
      <span className="font-display text-xs font-semibold text-white/85">{label}</span>
      <span className="font-mono text-[10px] text-white/45">{hint}</span>
    </div>
  );
}

function ThemeSwitcher() {
  const themeId = useGameSelector((snapshot) => snapshot.themeId);
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Thème</p>
      <div className="flex gap-3">
        {themePresets.map((preset) => {
          const active = preset.id === themeId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                sound.uiClick();
                gameActions.setTheme(preset.id);
              }}
              aria-label={preset.brandName}
              className="pointer-events-auto h-9 w-9 rounded-full transition active:scale-90"
              style={{
                background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.accent})`,
                outline: active ? "2px solid #fff" : "2px solid transparent",
                outlineOffset: "2px",
                boxShadow: active ? `0 0 16px ${preset.colors.primary}` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  settingKey,
  label,
}: {
  settingKey: keyof GameSettings;
  label: string;
}) {
  const value = useGameSelector((snapshot) => snapshot.settings[settingKey]);
  return (
    <button
      type="button"
      onClick={() => {
        sound.init();
        sound.uiClick();
        gameActions.setSetting(settingKey, !value);
      }}
      className="pointer-events-auto flex w-full items-center justify-between rounded-xl bg-white/8 px-4 py-3 transition active:scale-[0.98]"
    >
      <span className="font-display text-sm font-medium text-white/90">{label}</span>
      <span
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: value ? themeConfig.colors.primary : "rgba(255,255,255,0.18)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: value ? "calc(100% - 1.375rem)" : "0.125rem" }}
        />
      </span>
    </button>
  );
}

function SettingsPanel() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Toggle settingKey="sfx" label="Effets sonores" />
      <Toggle settingKey="music" label="Musique" />
      <Toggle settingKey="reducedMotion" label="Animations réduites" />
    </div>
  );
}

function Menu({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const startPress = () => {
    pressTimer.current = window.setTimeout(onOpenStudio, 1500);
  };
  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <ScreenShell>
      <div
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        className="flex flex-col items-center"
      >
        {themeConfig.logoUrl ? (
          <img
            src={themeConfig.logoUrl}
            alt={themeConfig.brandName}
            className="max-h-24 w-auto object-contain"
            draggable={false}
          />
        ) : (
          <h1
            className="font-display text-5xl font-bold uppercase tracking-tight"
            style={{ color: themeConfig.colors.primary }}
          >
            {themeConfig.brandName}
          </h1>
        )}
        <p className="mt-3 max-w-xs font-display text-sm leading-relaxed text-white/70">
          {themeConfig.tagline}
        </p>
      </div>

      <PrimaryButton onClick={gameActions.startGame}>Jouer</PrimaryButton>

      <div className="grid w-full grid-cols-3 gap-3 text-left">
        <Legend color={themeConfig.colors.accent} label="Bonus" hint="+ points" />
        <Legend color={themeConfig.colors.secondary} label="Rare" hint="× points" />
        <Legend color="#ff2d55" label="Malus" hint="à esquiver" />
      </div>

      <ThemeSwitcher />

      <p className="font-mono text-[11px] leading-relaxed text-white/50">
        Power-ups : <span style={{ color: themeConfig.colors.primary }}>bouclier</span> ·{" "}
        <span style={{ color: themeConfig.colors.secondary }}>aimant</span> ·{" "}
        <span style={{ color: themeConfig.colors.accent }}>ralenti</span>
      </p>

      {showSettings ? <SettingsPanel /> : null}
      <GhostButton onClick={() => setShowSettings((open) => !open)}>
        {showSettings ? "Fermer" : "Réglages"}
      </GhostButton>

      <SponsorBanner />

      <p className="font-mono text-xs leading-relaxed text-white/45">
        Clavier : ← / → (ou A / D). Mobile : touche la gauche ou la droite de l'écran.
      </p>
    </ScreenShell>
  );
}

function Countdown() {
  const [value, setValue] = useState(3);

  useEffect(() => {
    sound.countdownBeep(false);
    let remaining = 3;
    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(interval);
        sound.countdownBeep(true);
        gameActions.beginPlay();
      } else {
        sound.countdownBeep(false);
        setValue(remaining);
      }
    }, 700);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        key={value}
        className="font-display text-[7rem] font-bold leading-none"
        style={{
          color: themeConfig.colors.primary,
          textShadow: `0 0 40px ${themeConfig.colors.primary}`,
          animation: "ibrPop 0.7s ease-out",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Interstitial() {
  const sponsor = themeConfig.sponsor;
  const delay = sponsor?.interstitialDelay ?? 3000;
  const [remaining, setRemaining] = useState(Math.ceil(delay / 1000));
  const ready = remaining <= 0;

  useEffect(() => {
    if (delay <= 0) {
      setRemaining(0);
      return;
    }
    setRemaining(Math.ceil(delay / 1000));
    const interval = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [delay]);

  return (
    <ScreenShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        Présenté par
      </p>
      {sponsor?.logoUrl ? (
        sponsor.link ? (
          <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="pointer-events-auto">
            <img src={sponsor.logoUrl} alt="Sponsor" className="max-h-28 w-auto object-contain" />
          </a>
        ) : (
          <img src={sponsor.logoUrl} alt="Sponsor" className="max-h-28 w-auto object-contain" />
        )
      ) : null}
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          sound.uiClick();
          gameActions.startGame();
        }}
        style={{
          background: ready ? themeConfig.colors.primary : "rgba(255,255,255,0.12)",
          boxShadow: ready ? `0 0 32px ${themeConfig.colors.primary}80` : "none",
        }}
        className="pointer-events-auto rounded-2xl px-10 py-4 font-display text-lg font-bold uppercase tracking-[0.18em] text-black transition active:scale-95 disabled:cursor-not-allowed disabled:text-white/50"
      >
        {ready ? "Continuer" : `Continuer (${remaining} s)`}
      </button>
    </ScreenShell>
  );
}

function PauseScreen() {
  return (
    <ScreenShell>
      <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">Pause</h2>
      <SettingsPanel />
      <div className="flex flex-col items-center gap-3">
        <PrimaryButton onClick={gameActions.togglePause}>Reprendre</PrimaryButton>
        <GhostButton onClick={gameActions.returnToMenu}>Quitter</GhostButton>
      </div>
    </ScreenShell>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p
        className="mt-1 font-mono text-lg font-bold tabular-nums"
        style={{ color: accent ? themeConfig.colors.secondary : "#ffffff" }}
      >
        {value}
      </p>
    </div>
  );
}

function GameOver() {
  const score = useGameSelector((snapshot) => snapshot.score);
  const bestScore = useGameSelector((snapshot) => snapshot.bestScore);
  const finalDistance = useGameSelector((snapshot) => snapshot.finalDistance);
  const leaderboard = useGameSelector((snapshot) => snapshot.leaderboard);
  const isRecord = score >= bestScore && score > 0;

  return (
    <ScreenShell>
      <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">Terminé</h2>
      {isRecord ? (
        <p
          className="font-display text-sm font-semibold uppercase tracking-[0.2em]"
          style={{ color: themeConfig.colors.secondary }}
        >
          Nouveau record
        </p>
      ) : null}

      <div className="grid w-full grid-cols-3 gap-3">
        <Stat label="Score" value={score.toLocaleString("fr-FR")} accent />
        <Stat label="Record" value={bestScore.toLocaleString("fr-FR")} />
        <Stat label="Distance" value={`${finalDistance.toLocaleString("fr-FR")} m`} />
      </div>

      {leaderboard.length > 0 ? (
        <div className="w-full">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            Meilleurs scores
          </p>
          <div className="flex flex-col gap-1">
            {leaderboard.map((entry, i) => {
              const highlight = entry === score && isRecord && i === 0;
              return (
                <div
                  key={`${entry}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-1.5"
                >
                  <span className="font-mono text-xs text-white/55">#{i + 1}</span>
                  <span
                    className="font-mono text-sm font-bold tabular-nums"
                    style={{ color: highlight ? themeConfig.colors.secondary : "#ffffff" }}
                  >
                    {entry.toLocaleString("fr-FR")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <PrimaryButton onClick={gameActions.requestReplay}>Rejouer</PrimaryButton>
        <GhostButton onClick={gameActions.returnToMenu}>Menu</GhostButton>
      </div>

      <SponsorBanner />
    </ScreenShell>
  );
}

export default function App() {
  const phase = useGameSelector((snapshot) => snapshot.phase);
  const runId = useGameSelector((snapshot) => snapshot.runId);
  const themeId = useGameSelector((snapshot) => snapshot.themeId);
  // Abonnement à la révision du thème : l'aperçu live re-rend l'UI et la scène
  // sans remonter le <Canvas> (sa clé ne dépend que de themeId + runId).
  useGameSelector((snapshot) => snapshot.themeRevision);

  const [studioOpen, setStudioOpen] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        gameActions.pause();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleVisibility);
    };
  }, []);

  // Accès discret au Studio via l'URL ?studio=1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") === "1") {
      gameActions.returnToMenu();
      setStudioOpen(true);
    }
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: themeConfig.colors.background }}
    >
      <GameScene key={`${themeId}-${runId}`} />

      {(phase === "playing" || phase === "paused" || phase === "countdown") && <Overlay />}
      {phase === "countdown" && <Countdown />}
      {phase === "menu" && <Menu onOpenStudio={() => setStudioOpen(true)} />}
      {phase === "paused" && <PauseScreen />}
      {phase === "gameover" && <GameOver />}
      {phase === "interstitial" && <Interstitial />}

      {studioOpen ? <BrandStudio onClose={() => setStudioOpen(false)} /> : null}

      {phase === "menu" && !studioOpen ? (
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] tracking-wide text-white/35">
          Made by Mohand Idiki · @moh_end_267
        </p>
      ) : null}
    </div>
  );
}
