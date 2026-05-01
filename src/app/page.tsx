import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WhistleLogo } from "@/components/ui/WhistleLogo";

const RANKS = [
  {
    emoji: "🌿",
    name: "Sifflet de Bois",
    sub: "Tu commences. L'arbitre rigole.",
    w: "w-[12%]",
    bar: "bg-zinc-500",
  },
  {
    emoji: "🥉",
    name: "Sifflet de Bronze",
    sub: "Tu te chauffes. La commu t'écoute.",
    w: "w-[38%]",
    bar: "bg-amber-600",
  },
  {
    emoji: "🥈",
    name: "Sifflet d'Argent",
    sub: "L'arbitre te respecte.",
    w: "w-[65%]",
    bar: "bg-slate-400",
  },
  {
    emoji: "💎",
    name: "Sifflet de Diamant",
    sub: "La VAR t'appelle direct.",
    w: "w-[88%]",
    bar: "bg-cyan-400",
  },
];

export const metadata = {
  title: "Le Sifflet — Le Waze du foot",
  description:
    "Signale les fautes en direct, fais tes prédictions sur la VAR avant tout le monde et grimpe au rang de Sifflet d'Or.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-zinc-950 to-zinc-950 text-white">

      {/* ── Nav ── */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pb-4 pt-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <WhistleLogo size="sm" />
          <span className="text-sm font-black uppercase tracking-tight text-white">
            Le Sifflet
          </span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-400 transition hover:bg-green-500/20 active:scale-95"
        >
          Jouer →
        </Link>
      </nav>

      {/* ═══════════════════════════════════════════
          HERO — split-screen desktop
      ═══════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">

        {/* Decorative: pitch center circle */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full border border-white/[0.04]" />
          <div className="absolute h-3 w-3 rounded-full bg-white/[0.04]" />
        </div>

        {/* ── Left column : text ── */}
        <div className="relative z-10">
          {/* LIVE badge */}
          <div className="mb-5 flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              En direct pendant les matchs
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-[clamp(2.2rem,8vw,3.8rem)] font-black uppercase leading-[0.92] tracking-[-0.03em] text-white">
            T&rsquo;as sorti tes lunettes pour le hors-jeu&nbsp;?
          </h1>

          {/* Accent line */}
          <div className="mt-5 h-[3px] w-20 rounded-full bg-green-500" />

          {/* Subtitle */}
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-zinc-400">
            Arrête de crier devant ta télé. Prends le sifflet depuis ton canapé.
            Signale les fautes{" "}
            <em className="not-italic font-bold text-zinc-200">en direct</em>,
            fais tes prédictions sur la VAR{" "}
            <em className="not-italic font-bold text-zinc-200">avant tout le monde</em>{" "}
            et prouve que t&rsquo;as le niveau.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_28px_rgba(250,204,21,0.4)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] active:scale-[0.97]"
            >
              ⚡ Jouer gratuitement →
            </Link>
            <a
              href="#comment"
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white active:scale-95"
            >
              Comment ça marche&nbsp;?
            </a>
          </div>

          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 lg:text-left">
            100% gratuit · Aucun argent réel · PWA mobile
          </p>
        </div>

        {/* ── Right column : phone + floating cards ── */}
        <div className="relative z-10 mt-12 flex justify-center lg:mt-0">
          <div className="relative lg:rotate-6">
            <PhoneMockup />

            {/* Floating card : récompense */}
            <div className="absolute -left-10 top-12 hidden rounded-2xl border border-white/10 bg-zinc-800/90 px-3 py-2 shadow-2xl backdrop-blur-sm lg:block">
              <p className="text-[8px] font-bold text-zinc-400">🎉 Prédiction juste !</p>
              <p className="text-[11px] font-black text-green-400">+500 Sifflets</p>
            </div>

            {/* Floating card : VAR */}
            <div className="absolute -right-8 bottom-24 hidden rounded-2xl border border-red-500/20 bg-zinc-800/90 px-3 py-2 shadow-2xl backdrop-blur-sm lg:block">
              <p className="text-[8px] font-black uppercase tracking-widest text-red-400">
                ⚡ VAR EN COURS
              </p>
              <p className="text-[10px] font-bold text-zinc-300">127 signalements</p>
            </div>

            {/* Floating card : multiplicateur */}
            <div className="absolute -left-12 bottom-40 hidden rounded-2xl border border-yellow-500/20 bg-zinc-800/90 px-3 py-2 shadow-2xl backdrop-blur-sm lg:block">
              <p className="text-[8px] font-bold text-zinc-400">Multiplicateur</p>
              <p className="text-[14px] font-black text-yellow-400">×2.0</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          COMMENT ÇA MARCHE — 3 cols desktop
      ═══════════════════════════════════════════ */}
      <section id="comment" className="scroll-mt-8 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          {/* Eyebrow */}
          <div className="mb-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Mécaniques de jeu
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <h2 className="mt-4 text-center text-[clamp(1.7rem,5vw,2.6rem)] font-black uppercase leading-tight tracking-tight text-white">
            Le Waze du football.
            <br />
            <span className="text-green-400">En direct.</span>
          </h2>

          {/* 3 cards — middle card elevated on desktop */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <HowCard
              step="01"
              emoji="⚡"
              color="green"
              title="Signalement Waze"
              body="Une embrouille dans la surface&nbsp;? Signale l&rsquo;action. Si la commu confirme, la fenêtre de prédiction s&rsquo;ouvre pour tout le monde."
            />
            <div className="md:-translate-y-4 lg:-translate-y-6">
              <HowCard
                step="02"
                emoji="🪙"
                color="yellow"
                title="Prédictions Flash"
                body="Pénalty, rouge, but annulé&nbsp;? Engage tes Sifflets dans la seconde avant le verrouillage. Plus tu dégaines vite, plus le multiplicateur est élevé."
              />
            </div>
            <HowCard
              step="03"
              emoji="🛡️"
              color="blue"
              title="Monte en Grade"
              body="Tes pronos sont bons&nbsp;? Gagne du Karma, débloque des trophées et deviens le Modérateur légendaire du Kop."
            />
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
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
          GAMIFICATION — flex row on desktop
      ═══════════════════════════════════════════ */}
      <section className="py-4 pb-16 lg:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-zinc-900">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-green-500/10 blur-3xl" />
              <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-whistle/8 blur-3xl" />
            </div>

            <div className="relative p-6 lg:flex lg:items-center lg:gap-10 lg:p-10">

              {/* Ranks */}
              <div className="flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Progression
                </span>
                <h2 className="mt-1 text-[clamp(1.3rem,4vw,1.9rem)] font-black uppercase leading-tight tracking-tight text-white">
                  Prouve ton expertise
                  <br />
                  <span className="animate-shimmer bg-[length:200%_auto] bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                    au Kop.
                  </span>
                </h2>

                <div className="mt-6 flex flex-col gap-4">
                  {RANKS.map((rank) => (
                    <div key={rank.name} className="flex items-center gap-3">
                      <span className="text-xl" aria-hidden>
                        {rank.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-black text-white">{rank.name}</p>
                          <p className="shrink-0 text-[9px] text-zinc-600">{rank.sub}</p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-[width] duration-700 ${rank.bar} ${rank.w}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trophy card */}
              <div className="mt-7 flex items-center justify-center gap-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 lg:mt-0 lg:min-w-[260px] lg:flex-col lg:py-8">
                <div className="relative shrink-0">
                  <div
                    className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-r from-yellow-500/20 via-yellow-300/40 to-yellow-500/20 blur-xl"
                    aria-hidden
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_32px_rgba(250,204,21,0.5)]">
                    <svg width={36} height={36} viewBox="0 0 24 24" fill="white" aria-hidden>
                      <circle cx="8" cy="12" r="8" />
                      <rect x="14" y="8" width="10" height="8" rx="4" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    Sifflet d&rsquo;Or
                  </p>
                  <p className="mt-0.5 text-4xl font-black tabular-nums text-white">98%</p>
                  <p className="text-[10px] text-zinc-500">
                    de pronos réussis · Niveau légendaire
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DESKTOP QR — hidden on mobile
      ═══════════════════════════════════════════ */}
      <section className="hidden border-t border-white/8 py-16 md:block">
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 sm:px-8">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
            Application mobile
          </span>
          <h2 className="mt-2 text-center text-[clamp(1.5rem,4vw,2.2rem)] font-black uppercase leading-tight tracking-tight text-white">
            Le Sifflet se joue
            <br />
            <span className="text-green-400">dans le canapé.</span>
          </h2>
          <p className="mt-3 max-w-[280px] text-center text-sm leading-relaxed text-zinc-500">
            Scanne depuis ton mobile et rejoins le Kop en direct pour le prochain match.
          </p>

          {/* QR with neon border */}
          <div className="mt-8 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-green-500/40 bg-zinc-900 shadow-[0_0_32px_rgba(34,197,94,0.15)]">
            <div className="flex flex-col items-center gap-2">
              <QrCode className="h-20 w-20 text-green-400/60" strokeWidth={1.5} />
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                QR bientôt disponible
              </span>
            </div>
          </div>
          <p className="mt-5 text-[11px] text-zinc-600">
            Ou ouvre directement{" "}
            <span className="font-bold text-green-400">ton lien de déploiement</span> sur
            mobile
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/8 py-8 text-center">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          © 2026 Le Sifflet. Fait avec passion, mauvaise foi et zéro argent réel.
        </p>
      </footer>
    </main>
  );
}

// ── Composants internes ───────────────────────────────────────────────────────

function HowCard({
  step,
  emoji,
  color,
  title,
  body,
}: {
  step: string;
  emoji: string;
  color: "green" | "yellow" | "blue";
  title: string;
  body: string;
}) {
  const accent = {
    green: {
      border: "hover:border-green-500/30",
      glow: "bg-green-500/5 group-hover:bg-green-500/10",
      tag: "text-green-400",
    },
    yellow: {
      border: "hover:border-yellow-500/30",
      glow: "bg-yellow-500/5 group-hover:bg-yellow-500/10",
      tag: "text-yellow-400",
    },
    blue: {
      border: "hover:border-blue-500/30",
      glow: "bg-blue-500/5 group-hover:bg-blue-500/10",
      tag: "text-blue-400",
    },
  }[color];

  return (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 p-5 transition-all ${accent.border}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl transition-colors ${accent.glow}`}
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-2xl">
          {emoji}
        </div>
        <div>
          <p className={`text-[9px] font-black uppercase tracking-widest ${accent.tag}`}>
            {step} — {title}
          </p>
          <p
            className="mt-1.5 text-sm leading-relaxed text-zinc-300"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-52">
      {/* Glow behind phone */}
      <div
        className="absolute inset-0 -m-6 rounded-[3.5rem] bg-green-500/10 blur-3xl"
        aria-hidden
      />

      {/* Phone frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        {/* Notch */}
        <div className="flex items-center justify-center border-b border-zinc-800 py-2.5">
          <div className="h-1.5 w-14 rounded-full bg-zinc-700" />
        </div>

        {/* Screen */}
        <div className="flex flex-col gap-2.5 bg-zinc-950 p-3 pb-5">
          {/* Scoreboard mini */}
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

          {/* Event header */}
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

          {/* Engagement row */}
          <div className="flex items-center rounded-lg bg-zinc-800/80 px-2.5 py-1.5">
            <span className="text-[8px] text-zinc-500">Engagement</span>
            <span className="ml-auto text-[10px] font-black text-white">50 pts</span>
            <span className="ml-1.5 text-[8px] text-green-400">→ +100</span>
          </div>

          {/* Validate CTA */}
          <div className="flex items-center justify-center rounded-xl bg-green-500 py-2.5">
            <span className="text-[9px] font-black uppercase tracking-wide text-zinc-950">
              Valider ma prédiction →
            </span>
          </div>
        </div>
      </div>

      {/* LIVE badge */}
      <div className="absolute -right-4 top-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 shadow-lg shadow-red-900/40">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[9px] font-black text-white">LIVE</span>
      </div>

      {/* Notification bubble — visible on mobile only (desktop uses floating cards above) */}
      <div className="absolute -left-6 bottom-20 max-w-[130px] rounded-2xl border border-white/10 bg-zinc-800 px-3 py-2 shadow-xl lg:hidden">
        <p className="text-[8px] font-bold text-zinc-400">🎉 Prédiction juste !</p>
        <p className="text-[10px] font-black text-green-400">+200 Sifflets</p>
      </div>
    </div>
  );
}
