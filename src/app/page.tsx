import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WhistleLogo } from "@/components/ui/WhistleLogo";

const RANKS = [
  { emoji: "🌿", name: "Sifflet de Bois",    sub: "Tu commences. L'arbitre rigole.",    w: "w-[12%]", bar: "bg-zinc-500"  },
  { emoji: "🥉", name: "Sifflet de Bronze",  sub: "Tu te chauffes. La commu t'écoute.", w: "w-[38%]", bar: "bg-amber-600" },
  { emoji: "🥈", name: "Sifflet d'Argent",   sub: "L'arbitre te respecte.",             w: "w-[65%]", bar: "bg-slate-400" },
  { emoji: "💎", name: "Sifflet de Diamant", sub: "La VAR t'appelle direct.",           w: "w-[88%]", bar: "bg-cyan-400"  },
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
    <main
      className="min-h-screen overflow-x-hidden text-white"
      style={{ background: "radial-gradient(ellipse at top, rgba(6,78,59,0.35) 0%, #09090b 55%)" }}
    >
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
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">

        {/* Pitch deco */}
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

          <h1 className="text-[clamp(2.4rem,8vw,4.2rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-white">
            T&rsquo;as sorti tes lunettes pour le hors-jeu&nbsp;?
          </h1>

          <div className="mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-300" />

          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-400">
            Deviens le premier arbitre de ton canapé. Rejoins la communauté qui signale
            les fautes en direct, prédis les décisions de la VAR avant l&rsquo;arbitre
            central, et prouve ton expertise foot.{" "}
            <em className="not-italic font-bold text-zinc-200">100% gratuit.</em>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_32px_rgba(250,204,21,0.45)] transition hover:scale-[1.02] hover:shadow-[0_0_48px_rgba(250,204,21,0.55)] active:scale-[0.97]"
            >
              ⚡ Lancer une prédiction éclair →
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
          {/* Phone with tilt + floating cards */}
          <div className="relative lg:rotate-[14deg] lg:translate-y-4">
            {/* Scale up on desktop */}
            <div className="lg:scale-110 lg:origin-center">
              <PhoneMockup />
            </div>

            {/* Floating card 1 : récompense */}
            <div
              className="absolute -left-14 top-14 hidden rounded-2xl border border-green-500/20 bg-zinc-800/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-sm lg:block"
              style={{ animation: "float 4s ease-in-out infinite" }}
            >
              <p className="text-[8px] font-bold text-zinc-400">🎉 Prédiction juste !</p>
              <p className="text-[13px] font-black text-green-400">+500 Sifflets</p>
            </div>

            {/* Floating card 2 : VAR */}
            <div
              className="absolute -right-12 top-1/3 hidden rounded-2xl border border-red-500/20 bg-zinc-800/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-sm lg:block"
              style={{ animation: "float 5s ease-in-out 0.8s infinite" }}
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-red-400">
                ⚡ VAR EN COURS
              </p>
              <p className="text-[10px] font-bold text-zinc-300">127 signalements</p>
            </div>

            {/* Floating card 3 : multiplicateur */}
            <div
              className="absolute -left-16 bottom-28 hidden rounded-2xl border border-yellow-500/20 bg-zinc-800/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-sm lg:block"
              style={{ animation: "float 4.5s ease-in-out 1.6s infinite" }}
            >
              <p className="text-[8px] font-bold text-zinc-400">Multiplicateur</p>
              <p className="text-[17px] font-black text-yellow-400">×2.0</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          COMMENT ÇA MARCHE — Game Panels
      ═══════════════════════════════════════════ */}
      <section id="comment" className="scroll-mt-8 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">

          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Mécaniques de jeu
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <h2 className="mt-4 text-center text-[clamp(1.9rem,5.5vw,3rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
            Le Waze du football.
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              En direct.
            </span>
          </h2>

          {/* 3 Game Panels — middle card surélevé */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <GamePanel
              step="01"
              emoji="⚡"
              color="green"
              title="Le Signalement Communautaire"
              body="Une embrouille dans la surface ? Signale l'action. Si le reste du canapé valide ton flair, le chrono démarre."
            />
            <div className="md:-translate-y-6 lg:-translate-y-10">
              <GamePanel
                step="02"
                emoji="🪙"
                color="yellow"
                title="La Prédiction Éclair"
                body="60 secondes pour lire dans les pensées de l'arbitre. Engage tes Sifflets sur le verdict de la VAR. Plus ton réflexe est bon, plus ton multiplicateur explose."
              />
            </div>
            <GamePanel
              step="03"
              emoji="👑"
              color="purple"
              title="Le Score de Karma"
              body="Tes intuitions sont toujours justes ? Fais exploser ton Karma pour débloquer des trophées de prestige et devenir la légende de l'appli."
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
          GAMIFICATION — flex row desktop
      ═══════════════════════════════════════════ */}
      <section className="pb-20 lg:py-8 lg:pb-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-zinc-900">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-500/8 blur-3xl" />
            </div>

            <div className="relative p-6 lg:flex lg:items-center lg:gap-14 lg:p-12">

              {/* Rang progression */}
              <div className="flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Progression
                </span>
                <h2 className="mt-1.5 text-[clamp(1.4rem,4vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
                  Prouve ton expertise
                  <br />
                  <span className="animate-shimmer bg-[length:200%_auto] bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                    au Kop.
                  </span>
                </h2>

                <div className="mt-7 flex flex-col gap-4">
                  {RANKS.map((rank) => (
                    <div key={rank.name} className="flex items-center gap-3">
                      <span className="text-xl" aria-hidden>{rank.emoji}</span>
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

              {/* Trophy Sifflet d'Or — flottant */}
              <div className="mt-8 flex items-center justify-center gap-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 lg:mt-0 lg:min-w-[280px] lg:flex-col lg:py-10">
                <div
                  className="relative shrink-0"
                  style={{ animation: "float 3.5s ease-in-out infinite" }}
                >
                  <div
                    className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-r from-yellow-500/20 via-yellow-300/40 to-yellow-500/20 blur-2xl"
                    aria-hidden
                  />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_48px_rgba(250,204,21,0.6)]">
                    <svg width={42} height={42} viewBox="0 0 24 24" fill="white" aria-hidden>
                      <circle cx="8" cy="12" r="8" />
                      <rect x="14" y="8" width="10" height="8" rx="4" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    Sifflet d&rsquo;Or
                  </p>
                  <p className="mt-1 text-5xl font-black tabular-nums text-white">98%</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    de pronos réussis · Niveau légendaire
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DESKTOP QR
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

          <div className="mt-8 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-green-500/40 bg-zinc-900 shadow-[0_0_40px_rgba(34,197,94,0.18)]">
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

const GAME_PANEL_STYLES = {
  green: {
    border:  "border-green-500/25 hover:border-green-500/50",
    glow:    "bg-green-500/10",
    iconBg:  "bg-green-500/15 ring-1 ring-green-500/30",
    accent:  "text-green-400",
    shadow:  "hover:shadow-[0_0_40px_rgba(34,197,94,0.08)]",
  },
  yellow: {
    border:  "border-yellow-500/25 hover:border-yellow-500/50",
    glow:    "bg-yellow-500/10",
    iconBg:  "bg-yellow-500/15 ring-1 ring-yellow-500/30",
    accent:  "text-yellow-400",
    shadow:  "hover:shadow-[0_0_40px_rgba(250,204,21,0.08)]",
  },
  purple: {
    border:  "border-purple-500/25 hover:border-purple-500/50",
    glow:    "bg-purple-500/10",
    iconBg:  "bg-purple-500/15 ring-1 ring-purple-500/30",
    accent:  "text-purple-400",
    shadow:  "hover:shadow-[0_0_40px_rgba(168,85,247,0.08)]",
  },
} as const;

function GamePanel({
  step,
  emoji,
  color,
  title,
  body,
}: {
  step: string;
  emoji: string;
  color: keyof typeof GAME_PANEL_STYLES;
  title: string;
  body: string;
}) {
  const s = GAME_PANEL_STYLES[color];

  return (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border bg-zinc-900 p-6 transition-all ${s.border} ${s.shadow}`}
    >
      {/* Corner glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl transition-opacity group-hover:opacity-150 ${s.glow}`}
        aria-hidden
      />

      {/* Emoji icon */}
      <div
        className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${s.iconBg}`}
      >
        {emoji}
      </div>

      {/* Step + title */}
      <p className={`mb-2 text-[9px] font-black uppercase tracking-widest ${s.accent}`}>
        {step} — {title}
      </p>

      {/* Body */}
      <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-52">
      {/* Glow */}
      <div
        className="absolute inset-0 -m-6 rounded-[3.5rem] bg-green-500/15 blur-3xl"
        aria-hidden
      />

      {/* Phone frame */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
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

          {/* Engagement row */}
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
      <div className="absolute -right-4 top-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 shadow-lg shadow-red-900/40">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[9px] font-black text-white">LIVE</span>
      </div>

      {/* Notification bubble — mobile only */}
      <div className="absolute -left-6 bottom-20 max-w-[130px] rounded-2xl border border-white/10 bg-zinc-800 px-3 py-2 shadow-xl lg:hidden">
        <p className="text-[8px] font-bold text-zinc-400">🎉 Prédiction juste !</p>
        <p className="text-[10px] font-black text-green-400">+200 Sifflets</p>
      </div>
    </div>
  );
}
