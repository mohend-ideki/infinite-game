import { themeConfig } from "../../config/themeConfig";

export function SponsorBanner() {
  const sponsor = themeConfig.sponsor;
  if (!sponsor?.logoUrl) {
    return null;
  }

  const content = (
    <span className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 backdrop-blur-md">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
        Partenaire
      </span>
      <img src={sponsor.logoUrl} alt="Sponsor" className="h-6 w-auto object-contain" />
    </span>
  );

  if (sponsor.link) {
    return (
      <a
        href={sponsor.link}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto inline-flex transition active:scale-95"
      >
        {content}
      </a>
    );
  }

  return <span className="inline-flex">{content}</span>;
}
