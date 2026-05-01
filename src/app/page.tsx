import { redirect } from "next/navigation";
import Link from "next/link";
import { Monitor, Zap, Shield, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "VAR Time — L'arbitre, c'est toi",
  description:
    "Lance l'alerte, prédis le verdict de la VAR en direct et prouve ton instinct au kop. 100% gratuit.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  return (
    <main
      className="min-h-screen overflow-x-hidden text-white"
      style={{ background: "radial-gradient(ellipse at top, rgba(6,78,59,0.14) 0%, #09090b 60%)" }}
    >

      {/* ── Nav ── */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pb-4 pt-6 sm:px-8">
        {/* VAR TIME logo — geste carré VAR */}
        <div className="flex items-center gap-2.5">
          <span className="rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-black tracking-widest text-white">
            VAR
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-white">TIME</span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-400 transition hover:bg-green-500/20 active:scale-95"
        >
          Jouer →
        </Link>
      </nav>

      {/* ═══════════════════════════════════════════
          HERO — split screen asymétrique
      ═══════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">

        {/* Deco pitch */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full border border-white/[0.03]" />
          <div className="absolute h-3 w-3 rounded-full bg-white/[0.04]" />
        </div>

        {/* ── Texte gauche ── */}
        <div className="relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              En direct pendant les matchs
            </span>
          </div>

          <h1 className="text-[clamp(2.4rem,8vw,4.5rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-white">
            T&rsquo;as sorti tes lunettes pour le hors-jeu&nbsp;?
          </h1>

          <div className="mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-300" />

          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-400">
            L&rsquo;arbitre est aveugle&nbsp;? Appelle la VAR. Lance l&rsquo;alerte,
            prédis le verdict en direct et prouve ton instinct au kop.{" "}
            <em className="not-italic font-bold text-zinc-200">100% gratuit.</em>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] transition hover:bg-green-400 hover:shadow-[0_0_45px_rgba(34,197,94,0.55)] active:scale-[0.97]"
            >
              Appeler la VAR →
            </Link>
            <a
              href="#comment"
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white active:scale-95"
            >
              Comment ça marche&nbsp;?
            </a>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            100% gratuit · Aucun argent réel · PWA mobile
          </p>
        </div>

        {/* ── Téléphone droite ── */}
        <div className="relative z-10 mt-14 flex justify-center lg:mt-0 lg:justify-end">
          <div className="relative lg:rotate-6">
            <PhoneMockup />

            {/* Floating card 1 */}
            <div
              className="absolute -left-12 top-14 hidden rounded-xl border border-white/10 bg-zinc-900/95 px-3 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.12)] lg:block"
              style={{ animation: "float 4s ease-in-out infinite" }}
            >
              <p className="text-[9px] font-bold text-zinc-500">Alerte communauté</p>
              <p className="text-[12px] font-black text-white">Penalty&nbsp;?</p>
            </div>

            {/* Floating card 2 */}
            <div
              className="absolute -right-10 bottom-28 hidden rounded-xl border border-green-500/20 bg-zinc-900/95 px-3 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.2)] lg:block"
              style={{ animation: "float 5s ease-in-out 1s infinite" }}
            >
              <p className="text-[9px] font-bold text-zinc-500">Prédiction juste</p>
              <p className="text-[13px] font-black text-green-400">+500 Pts</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          COMMENT ÇA MARCHE — Game Panels
      ═══════════════════════════════════════════ */}
      <section id="comment" className="scroll-mt-8 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">

          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Mécaniques de jeu
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <h2 className="mt-4 text-center text-[clamp(1.8rem,5vw,2.8rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
            Trois étapes.
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Zéro excuses.
            </span>
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <GamePanel
              step="01"
              Icon={Monitor}
              color="green"
              title="Le Signalement"
              body="Péno oublié ? Lance l'alerte. Si le canapé valide, les prédictions s'ouvrent."
            />
            <div className="md:-translate-y-4">
              <GamePanel
                step="02"
                Icon={Zap}
                color="yellow"
                title="Le Chrono"
                body="60 secondes de pression. Engage tes points sur le verdict (OUI/NON). Plus tu es rapide, plus ça rapporte."
              />
            </div>
            <GamePanel
              step="03"
              Icon={Shield}
              color="blue"
              title="Le Karma"
              body="Ton flair est légendaire ? Fais exploser ton Karma, débloque des trophées et deviens le boss du kop."
            />
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/login"
              className="flex h-14 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 px-10 font-black uppercase tracking-wide text-green-400 transition hover:bg-green-500/20 active:scale-95"
            >
              Rejoindre le Kop →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MOBILE DOWNLOAD — desktop only
      ═══════════════════════════════════════════ */}
      <section className="hidden border-t border-white/8 md:block">
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-20 sm:px-8">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
            Application mobile
          </span>
          <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2.4rem)] font-black uppercase leading-tight tracking-tight text-white">
            Le match se joue
            <br />
            <span className="text-green-400">dans ta poche.</span>
          </h2>
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-zinc-500">
            Installe VAR Time sur ton mobile. Chaque match devient un duel d&rsquo;instincts.
          </p>

          {/* Store buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-white/15 bg-black px-5 py-3.5 transition hover:border-white/30"
              title="Bientôt disponible"
            >
              <AppleIcon className="h-6 w-6 shrink-0 text-white" />
              <div className="text-left">
                <p className="text-[9px] text-zinc-500">Download on the</p>
                <p className="text-sm font-black text-white">App Store</p>
              </div>
            </button>
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-white/15 bg-black px-5 py-3.5 transition hover:border-white/30"
              title="Bientôt disponible"
            >
              <AndroidIcon className="h-6 w-6 shrink-0 text-white" />
              <div className="text-left">
                <p className="text-[9px] text-zinc-500">Get it on</p>
                <p className="text-sm font-black text-white">Google Play</p>
              </div>
            </button>
          </div>

          {/* QR */}
          <div className="mt-8 flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-green-500/40 bg-zinc-900 shadow-[0_0_40px_rgba(34,197,94,0.18)]">
            <div className="flex flex-col items-center gap-2">
              <QrCode className="h-16 w-16 text-green-400/60" strokeWidth={1.5} />
              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600">
                bientôt disponible
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/8 py-10 text-center">
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
          © 2026 VAR Time.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a href="#" className="text-[10px] text-zinc-700 transition hover:text-zinc-500">CGU</a>
          <span className="text-zinc-800">•</span>
          <a href="#" className="text-[10px] text-zinc-700 transition hover:text-zinc-500">Mentions Légales</a>
          <span className="text-zinc-800">•</span>
          <a href="#" className="text-[10px] text-zinc-700 transition hover:text-zinc-500">Jeu Responsable</a>
        </div>
        <p className="mx-auto mt-4 max-w-sm px-4 text-[9px] text-zinc-700">
          VAR Time est un jeu gratuit de simulation. Aucun argent réel ne peut être engagé ou gagné.
        </p>
      </footer>
    </main>
  );
}

// ── Composants internes ───────────────────────────────────────────────────────

const PANEL_STYLES = {
  green: {
    border:  "border-zinc-800 hover:border-green-500/40",
    glow:    "bg-green-500/8",
    icon:    "text-green-400",
    shadow:  "hover:shadow-[0_0_30px_rgba(34,197,94,0.07)]",
  },
  yellow: {
    border:  "border-zinc-800 hover:border-yellow-500/40",
    glow:    "bg-yellow-500/8",
    icon:    "text-yellow-400",
    shadow:  "hover:shadow-[0_0_30px_rgba(250,204,21,0.07)]",
  },
  blue: {
    border:  "border-zinc-800 hover:border-blue-500/40",
    glow:    "bg-blue-500/8",
    icon:    "text-blue-400",
    shadow:  "hover:shadow-[0_0_30px_rgba(59,130,246,0.07)]",
  },
} as const;

function GamePanel({
  step,
  Icon,
  color,
  title,
  body,
}: {
  step: string;
  Icon: React.ElementType;
  color: keyof typeof PANEL_STYLES;
  title: string;
  body: string;
}) {
  const s = PANEL_STYLES[color];
  return (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border bg-zinc-900/50 p-6 backdrop-blur-sm transition-all ${s.border} ${s.shadow}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl ${s.glow}`}
        aria-hidden
      />
      <Icon className={`relative mb-5 h-10 w-10 ${s.icon}`} strokeWidth={1.5} />
      <p className={`mb-2 text-[9px] font-black uppercase tracking-widest ${s.icon}`}>
        {step} — {title}
      </p>
      <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-52">
      <div
        className="absolute inset-0 -m-6 rounded-[3.5rem] bg-green-500/15 blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(34,197,94,0.08)]">
        {/* Notch */}
        <div className="flex items-center justify-center border-b border-zinc-800 py-2.5">
          <div className="h-1.5 w-14 rounded-full bg-zinc-700" />
        </div>

        {/* Screen */}
        <div className="flex flex-col gap-2.5 bg-zinc-950 p-3 pb-5">
          {/* Scoreboard */}
          <div className="overflow-hidden rounded-xl bg-zinc-900">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[9px] font-black text-white">PSG</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">1</span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-black text-white">0</span>
              </div>
              <span className="text-[9px] font-black text-white">OL</span>
            </div>
            <div className="bg-green-500/10 px-3 py-1 text-center">
              <span className="text-[8px] font-black text-green-400">47&rsquo; EN DIRECT</span>
            </div>
          </div>

          {/* Event */}
          <div className="px-0.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
              Décision en cours
            </p>
            <p className="text-[0.85rem] font-black leading-tight text-white">
              Il y a péno là&nbsp;?!
            </p>
          </div>

          {/* Timer */}
          <div>
            <div className="mb-1.5 flex justify-between text-[8px]">
              <span className="text-zinc-500">Temps restant</span>
              <span className="font-black text-white">67s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-3/4 rounded-full bg-green-500" />
            </div>
          </div>

          {/* OUI / NON */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex h-12 flex-col items-center justify-center rounded-xl border-2 border-green-500 bg-green-500/15">
              <span className="text-[9px] font-black uppercase text-green-400">OUI</span>
              <span className="text-sm font-black text-green-400">×2.00</span>
            </div>
            <div className="flex h-12 flex-col items-center justify-center rounded-xl border-2 border-zinc-600 bg-zinc-800">
              <span className="text-[9px] font-black uppercase text-zinc-300">NON</span>
              <span className="text-sm font-black text-zinc-400">×1.80</span>
            </div>
          </div>

          {/* Engagement */}
          <div className="flex items-center rounded-lg bg-zinc-800/80 px-2.5 py-1.5">
            <span className="text-[8px] text-zinc-500">Engagement</span>
            <span className="ml-auto text-[10px] font-black text-white">50 pts</span>
            <span className="ml-1.5 text-[8px] text-green-400">→ +100</span>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center rounded-xl bg-green-500 py-2.5">
            <span className="text-[9px] font-black uppercase tracking-wide text-zinc-950">
              Valider ma prédiction →
            </span>
          </div>
        </div>
      </div>

      {/* LIVE badge */}
      <div className="absolute -right-4 top-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[9px] font-black text-white">LIVE</span>
      </div>

      {/* Notification bubble — mobile only */}
      <div className="absolute -left-6 bottom-20 max-w-[130px] rounded-2xl border border-white/10 bg-zinc-800 px-3 py-2 shadow-[0_0_20px_rgba(34,197,94,0.15)] lg:hidden">
        <p className="text-[8px] font-bold text-zinc-400">Prédiction juste</p>
        <p className="text-[10px] font-black text-green-400">+200 Pts</p>
      </div>
    </div>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.523 15.342a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-11.046 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2M3.513 8.958l1.56-2.702a.499.499 0 0 1 .863.499L4.375 9.457A9.5 9.5 0 0 0 12 18.5a9.5 9.5 0 0 0 7.625-9.043l-1.56-2.702a.499.499 0 0 1 .862-.499l1.56 2.702A11 11 0 0 1 23 11.5C23 17.854 18.075 23 12 23S1 17.854 1 11.5a11 11 0 0 1 2.513-7.042zM8.5 1.5l1.5 3h4l1.5-3H8.5z" />
    </svg>
  );
}
