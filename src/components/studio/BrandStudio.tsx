import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  cloneTheme,
  DEFAULT_THEME_ID,
  themePresets,
  type SponsorConfig,
  type ThemePreset,
} from "../../config/themeConfig";
import { gameActions, getCurrentTheme } from "../../store/gameStore";

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsText(file);
  });
}

function isThemeShape(value: unknown): value is ThemePreset {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.brandName === "string" &&
    typeof candidate.colors === "object" &&
    typeof candidate.physics === "object" &&
    typeof candidate.scoring === "object"
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-white/15 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-white/40"
        />
      </div>
    </Field>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <Field label={`${label} — ${value}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="w-full accent-white"
      />
    </Field>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-2 font-display text-sm font-semibold uppercase tracking-[0.15em] text-white/70">
      {children}
    </h3>
  );
}

export function BrandStudio({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<ThemePreset>(() => getCurrentTheme());
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sponsorInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const commit = (next: ThemePreset) => {
    setDraft(next);
    gameActions.applyLiveTheme(next);
  };

  const setColor = (key: keyof ThemePreset["colors"], value: string) =>
    commit({ ...draft, colors: { ...draft.colors, [key]: value } });

  const setPhysics = (key: keyof ThemePreset["physics"], value: number) =>
    commit({ ...draft, physics: { ...draft.physics, [key]: value } });

  const setScoring = (key: keyof ThemePreset["scoring"], value: number) =>
    commit({ ...draft, scoring: { ...draft.scoring, [key]: value } });

  const patchSponsor = (patch: Partial<SponsorConfig>) =>
    commit({ ...draft, sponsor: { ...(draft.sponsor ?? {}), ...patch } });

  const codeSnippet = useMemo(() => {
    const body = JSON.stringify(draft, null, 2);
    return `// À coller dans src/config/themeConfig.ts (dans themePresets ou comme thème par défaut)\nconst customTheme: ThemePreset = ${body};`;
  }, [draft]);

  const handleLogo = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      commit({ ...draft, logoUrl: dataUrl });
    } catch {
      setMessage("Logo : lecture impossible.");
    }
  };

  const handleSponsorLogo = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      patchSponsor({ logoUrl: dataUrl });
    } catch {
      setMessage("Logo sponsor : lecture impossible.");
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const text = await readText(file);
      const parsed: unknown = JSON.parse(text);
      if (!isThemeShape(parsed)) {
        setMessage("Import : format de thème invalide.");
        return;
      }
      commit(cloneTheme(parsed));
      setMessage("Thème importé.");
    } catch {
      setMessage("Import : fichier illisible.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setMessage("Code copié.");
    } catch {
      setMessage("Copie indisponible (sélectionne le texte manuellement).");
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0a0c12]/95 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold uppercase tracking-[0.15em] text-white">
            Studio de marque
          </h2>
          <p className="font-mono text-[10px] text-white/40">Aperçu en direct · white-label</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wide text-white/85 transition hover:bg-white/10 active:scale-95"
        >
          Fermer
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Field label="Point de départ (preset)">
          <div className="flex gap-2">
            <select
              value={themePresets.some((preset) => preset.id === draft.id) ? draft.id : ""}
              onChange={(event) => {
                const preset = themePresets.find((item) => item.id === event.target.value);
                if (preset) {
                  commit(cloneTheme(preset));
                }
              }}
              className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-2 text-sm text-white outline-none focus:border-white/40"
            >
              <option value="" disabled>
                Choisir un preset…
              </option>
              {themePresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.brandName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => commit({ ...draft, id: "custom" })}
              className="whitespace-nowrap rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
            >
              Nouveau
            </button>
          </div>
        </Field>

        <SectionTitle>Identité</SectionTitle>
        <Field label="Nom de marque">
          <input
            type="text"
            value={draft.brandName}
            onChange={(event) => commit({ ...draft, brandName: event.target.value })}
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </Field>
        <Field label="Accroche">
          <textarea
            value={draft.tagline}
            onChange={(event) => commit({ ...draft, tagline: event.target.value })}
            rows={2}
            className="w-full resize-none rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </Field>
        <Field label="Logo de marque">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
            >
              Importer une image
            </button>
            {draft.logoUrl ? (
              <button
                type="button"
                onClick={() => commit({ ...draft, logoUrl: undefined })}
                className="text-xs text-white/45 underline"
              >
                Retirer
              </button>
            ) : null}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleLogo(event.target.files?.[0])}
            />
          </div>
        </Field>

        <SectionTitle>Couleurs</SectionTitle>
        <ColorField label="Primaire" value={draft.colors.primary} onChange={(v) => setColor("primary", v)} />
        <ColorField label="Secondaire" value={draft.colors.secondary} onChange={(v) => setColor("secondary", v)} />
        <ColorField label="Accent" value={draft.colors.accent} onChange={(v) => setColor("accent", v)} />
        <ColorField label="Fond" value={draft.colors.background} onChange={(v) => setColor("background", v)} />

        <SectionTitle>Physique</SectionTitle>
        <SliderField label="Vitesse de base" value={draft.physics.baseSpeed} min={6} max={28} step={1} onChange={(v) => setPhysics("baseSpeed", v)} />
        <SliderField label="Accélération" value={draft.physics.accelerationRate} min={0} max={0.05} step={0.001} onChange={(v) => setPhysics("accelerationRate", v)} />
        <SliderField label="Gravité" value={draft.physics.gravity} min={0} max={20} step={0.1} onChange={(v) => setPhysics("gravity", v)} />

        <SectionTitle>Score</SectionTitle>
        <SliderField label="Points de base" value={draft.scoring.basePoints} min={1} max={50} step={1} onChange={(v) => setScoring("basePoints", v)} />
        <SliderField label="Base du combo" value={draft.scoring.comboMultiplierBase} min={1.1} max={2.5} step={0.05} onChange={(v) => setScoring("comboMultiplierBase", v)} />

        <SectionTitle>Sponsor (optionnel)</SectionTitle>
        <Field label="Logo sponsor">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => sponsorInputRef.current?.click()}
              className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
            >
              Importer une image
            </button>
            {draft.sponsor?.logoUrl ? (
              <button
                type="button"
                onClick={() => patchSponsor({ logoUrl: undefined })}
                className="text-xs text-white/45 underline"
              >
                Retirer
              </button>
            ) : null}
            <input
              ref={sponsorInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleSponsorLogo(event.target.files?.[0])}
            />
          </div>
        </Field>
        <Field label="Lien sponsor (https://…)">
          <input
            type="text"
            value={draft.sponsor?.link ?? ""}
            onChange={(event) => patchSponsor({ link: event.target.value })}
            placeholder="https://exemple.com"
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </Field>
        <label className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2.5">
          <span className="font-display text-sm text-white/85">Écran interstitiel entre parties</span>
          <input
            type="checkbox"
            checked={draft.sponsor?.interstitial ?? false}
            onChange={(event) => patchSponsor({ interstitial: event.target.checked })}
            className="h-4 w-4 accent-white"
          />
        </label>
        <SliderField
          label="Délai « Continuer » (ms)"
          value={draft.sponsor?.interstitialDelay ?? 3000}
          min={0}
          max={10000}
          step={500}
          onChange={(v) => patchSponsor({ interstitialDelay: v })}
        />

        <SectionTitle>Code à coller</SectionTitle>
        <textarea
          readOnly
          value={codeSnippet}
          rows={8}
          className="w-full resize-none rounded-md border border-white/15 bg-black/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/80 outline-none"
        />
        {message ? <p className="font-mono text-[11px] text-white/55">{message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-5 py-4">
        <button
          type="button"
          onClick={() => download(`${draft.id}-theme.json`, JSON.stringify(draft, null, 2), "application/json")}
          className="rounded-xl bg-white px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-black transition active:scale-95"
        >
          Exporter JSON
        </button>
        <button
          type="button"
          onClick={() => download(`${draft.id}-theme.ts`, codeSnippet, "text/typescript")}
          className="rounded-xl border border-white/20 px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10 active:scale-95"
        >
          Télécharger .ts
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-xl border border-white/20 px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10 active:scale-95"
        >
          Copier le code
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="rounded-xl border border-white/20 px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10 active:scale-95"
        >
          Importer JSON
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => {
            gameActions.resetCustomTheme(DEFAULT_THEME_ID);
            setDraft(getCurrentTheme());
            setMessage("Thème réinitialisé.");
          }}
          className="col-span-2 rounded-xl border border-white/20 px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-white/70 transition hover:bg-white/10 active:scale-95"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
