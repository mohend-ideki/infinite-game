import { useEffect, useRef, useState } from "react";
import { themeConfig } from "../../config/themeConfig";
import { sound } from "../../audio/sound";
import {
  gameActions,
  getGameState,
  MAGNET_DURATION_MS,
  MAX_HEALTH,
  playerPosition,
  SLOWMO_DURATION_MS,
  useGameSelector,
} from "../../store/gameStore";

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      {on ? (
        <path
          d="M16 8.5a4 4 0 0 1 0 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 9l5 6M21 9l-5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function Overlay() {
  const score = useGameSelector((snapshot) => snapshot.score);
  const multiplier = useGameSelector((snapshot) => snapshot.multiplier);
  const combo = useGameSelector((snapshot) => snapshot.combo);
  const health = useGameSelector((snapshot) => snapshot.health);
  const sfx = useGameSelector((snapshot) => snapshot.settings.sfx);
  const shield = useGameSelector((snapshot) => snapshot.powerups.shield);

  const [distance, setDistance] = useState(0);
  const [magnet, setMagnet] = useState(0);
  const [slowmo, setSlowmo] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const { powerups } = getGameState();
      setDistance(Math.max(0, Math.floor(playerPosition.z)));
      setMagnet(Math.max(0, (powerups.magnetUntil - now) / MAGNET_DURATION_MS));
      setSlowmo(Math.max(0, (powerups.slowmoUntil - now) / SLOWMO_DURATION_MS));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const healthRatio = Math.max(0, Math.min(1, health / MAX_HEALTH));
  const comboActive = combo > 1;
  const healthColor = healthRatio > 0.34 ? themeConfig.colors.primary : "#ff2d55";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">Score</p>
          <p className="font-mono text-3xl font-bold text-white tabular-nums sm:text-4xl">
            {score.toLocaleString("fr-FR")}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="rounded-2xl px-5 py-3 text-center backdrop-blur-md transition-transform duration-150"
            style={{
              background: comboActive ? `${themeConfig.colors.secondary}26` : "rgba(0,0,0,0.35)",
              boxShadow: comboActive ? `0 0 28px ${themeConfig.colors.secondary}66` : "none",
              transform: comboActive ? "scale(1.06)" : "scale(1)",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">Combo</p>
            <p
              className="font-mono text-3xl font-bold tabular-nums sm:text-4xl"
              style={{ color: comboActive ? themeConfig.colors.secondary : "#ffffff" }}
            >
              ×{multiplier.toFixed(1)}
            </p>
          </div>
          {comboActive ? (
            <p className="mt-1 font-mono text-xs text-white/60">{combo} d'affilée</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.init();
              sound.uiClick();
              gameActions.setSetting("sfx", !sfx);
            }}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/35 text-white backdrop-blur-md transition active:scale-90"
            aria-label={sfx ? "Couper le son" : "Activer le son"}
          >
            <SpeakerIcon on={sfx} />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.uiClick();
              gameActions.togglePause();
            }}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/35 text-white backdrop-blur-md transition active:scale-90"
            aria-label="Pause"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <PowerupBadges shield={shield} magnet={magnet} slowmo={slowmo} />
        <div className="flex items-end justify-between gap-4">
          <div className="w-40 max-w-[45vw] sm:w-56">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
                Énergie
              </span>
              <span className="font-mono text-[11px] text-white/55">{Math.ceil(health)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${healthRatio * 100}%`,
                  background: healthColor,
                  boxShadow: `0 0 14px ${healthColor}aa`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-black/35 px-4 py-2 text-right backdrop-blur-md">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
              Distance
            </p>
            <p className="font-mono text-xl font-bold text-white tabular-nums">
              {distance.toLocaleString("fr-FR")} m
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PowerupBadge({
  label,
  color,
  fraction,
}: {
  label: string;
  color: string;
  fraction: number;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur-md"
      style={{ boxShadow: `0 0 16px ${color}55` }}
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span className="font-display text-xs font-semibold text-white/90">{label}</span>
      {fraction > 0 ? (
        <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.min(1, fraction) * 100}%`, background: color }}
          />
        </span>
      ) : null}
    </div>
  );
}

function PowerupBadges({
  shield,
  magnet,
  slowmo,
}: {
  shield: boolean;
  magnet: number;
  slowmo: number;
}) {
  if (!shield && magnet <= 0 && slowmo <= 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shield ? <PowerupBadge label="Bouclier" color={themeConfig.colors.primary} fraction={0} /> : null}
      {magnet > 0 ? (
        <PowerupBadge label="Aimant" color={themeConfig.colors.secondary} fraction={magnet} />
      ) : null}
      {slowmo > 0 ? (
        <PowerupBadge label="Ralenti" color={themeConfig.colors.accent} fraction={slowmo} />
      ) : null}
    </div>
  );
}
