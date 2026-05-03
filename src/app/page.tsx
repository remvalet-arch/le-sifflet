import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CircleDollarSign,
  DoorOpen,
  Globe2,
  QrCode,
  Swords,
  Target,
  Calendar,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "VAR Time — La VAR, mais en jeu",
  description:
    "Parie en temps réel sur les décisions d'arbitre, grimpe au classement et braque tes potes dans tes ligues privées. 100% gratuit.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_rgba(22,163,74,0.07)_0%,_transparent_55%)] text-white">

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
          Entrer en jeu →
        </Link>
      </nav>

      {/* ═══════════════════════════════════════════
          HERO — stat 55% + split écran
      ═══════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">

        {/* ── Scan-lines deco ── */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 5px)" }}
          aria-hidden
        />

        {/* ── Halo ambre ── */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full bg-amber-500/5 blur-[80px]"
          aria-hidden
        />

        {/* ── Texte gauche ── */}
        <div className="relative z-10">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/95">
              La VAR, mais en jeu
            </span>
          </div>

          {/* ── Stat hero : 55% dans un cadre VAR ── */}
          <div className="relative mb-6 inline-block">
            {/* Corner brackets — geste de l'arbitre VAR */}
            <div className="pointer-events-none absolute -inset-4" aria-hidden>
              <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-amber-400/50" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-amber-400/50" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-amber-400/50" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-amber-400/50" />
            </div>
            {/* Label au-dessus */}
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/80">
              Temps de jeu effectif
            </p>
            {/* Chiffre */}
            <p
              className="font-black leading-none tracking-tight text-white"
              style={{
                fontSize: "clamp(5rem,18vw,9rem)",
                textShadow: "0 0 80px rgba(251,191,36,0.35), 0 0 30px rgba(251,191,36,0.15)",
              }}
            >
              55<span className="text-amber-400">%</span>
            </p>
          </div>

          {/* Divider */}
          <div className="mb-6 h-px w-full bg-gradient-to-r from-amber-500/40 via-amber-500/20 to-transparent" />

          <h1 className="text-[clamp(1.5rem,4.5vw,2.6rem)] font-black leading-tight tracking-tight text-white">
            Le ballon n&rsquo;est en jeu que{" "}
            <span className="text-amber-400">55% du temps</span>.
            <br />
            Et le reste&nbsp;? Prends les commandes de la VAR.
          </h1>

          <p className="mt-4 text-[clamp(1rem,2.5vw,1.2rem)] leading-relaxed text-zinc-400">
            Parie en temps réel sur les décisions de l&rsquo;arbitre. Grimpe au classement mondial et braque tes potes
            dans tes ligues privées.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] transition hover:bg-green-400 hover:shadow-[0_0_45px_rgba(34,197,94,0.55)] active:scale-[0.97]"
            >
              Entrer en jeu →
            </Link>
            <a
              href="#comment"
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white active:scale-95"
            >
              Comment ça marche&nbsp;?
            </a>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Gratuit · Monnaie fictive (Sifflets) · Aucun argent réel · PWA mobile
          </p>
        </div>

        {/* ── Téléphone droite ── */}
        <div className="relative z-10 mt-14 mb-32 flex justify-center pb-8 lg:mt-0 lg:mb-12 lg:justify-end lg:pb-4">
          <div className="relative lg:rotate-6">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[min(520px,140%)] w-[min(420px,120%)] rounded-full bg-emerald-500/20 blur-[100px] shadow-[0_0_80px_rgba(34,197,94,0.22)]"
              aria-hidden
            />
            <div className="relative">
              <PhoneMockup />
            </div>

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
              Gameplay
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <h2 className="mt-4 text-center text-[clamp(1.8rem,5vw,2.8rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
            Quatre façons
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              de jouer le match.
            </span>
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <GamePanel
              step="01"
              Icon={Zap}
              color="green"
              title="Live"
              body="T'as sorti tes lunettes pour le hors-jeu ? La VAR de ton canapé, c'est toi. Le chrono tourne, assume."
            />
            <GamePanel
              step="02"
              Icon={Globe2}
              color="blue"
              title="Classement"
              body="Le monde entier te regarde. Bats-toi pour le sommet du classement mondial."
            />
            <GamePanel
              step="03"
              Icon={Users}
              color="yellow"
              title="Squads"
              body="Le vestiaire, c'est chez toi. Invite tes potes, et braque leur cagnotte à la 90ème."
            />
            <GamePanel
              step="04"
              Icon={Warehouse}
              color="violet"
              title="Bunker"
              body="Pronos gratuits à gain fixe. Un match nul ? Réfugie-toi dans le Bunker 0-0."
            />
          </div>

          <div className="mb-2 mt-20 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              Comment ça marche
            </span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          <h3 className="mt-4 text-center text-[clamp(1.5rem,4vw,2.2rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
            Trois étapes.
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Jusqu&apos;au braquage.
            </span>
          </h3>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <GamePanel
              step="01"
              Icon={DoorOpen}
              color="green"
              title="Vestiaire"
              body="Tu crées ton compte, tu ouvres ton vestiaire : tu rejoins une ligue privée ou tu lances la tienne avec un code d&apos;invitation."
            />
            <div className="md:-translate-y-4">
              <GamePanel
                step="02"
                Icon={CircleDollarSign}
                color="yellow"
                title="Sifflets"
                body="Tu récupères des Sifflets : pronos gratuits, bons coups, progression. C&apos;est ta monnaie pour miser quand la VAR s&apos;ouvre."
              />
            </div>
            <GamePanel
              step="03"
              Icon={Swords}
              color="blue"
              title="Braquage"
              body="En direct, quand la modale tombe, tu paries avec ta ligue : le pot des perdants nourrit les gagnants — c&apos;est le braquage."
            />
          </div>

          {/* Pronostics avant match — carte pleine largeur */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 p-6 shadow-[0_0_50px_rgba(16,185,129,0.12)] backdrop-blur-sm sm:p-8 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
              <div className="relative mx-auto flex shrink-0 items-center justify-center md:mx-0">
                <div
                  className="absolute h-36 w-36 rounded-full bg-green-500/20 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex items-center gap-3">
                  <Target
                    className="h-20 w-20 text-green-400 drop-shadow-[0_0_24px_rgba(34,197,94,0.55)] sm:h-24 sm:w-24"
                    strokeWidth={1.25}
                  />
                  <Calendar
                    className="h-14 w-14 text-emerald-300/90 drop-shadow-[0_0_18px_rgba(52,211,153,0.45)] sm:h-16 sm:w-16"
                    strokeWidth={1.25}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h3 className="text-[clamp(1.35rem,4.5vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
                  Pas qu&rsquo;un excité du direct.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  Fais tes pronos d&rsquo;avant-match (score, buteurs) pour gagner des{" "}
                  <strong className="font-bold text-zinc-200">Sifflets</strong>. Ce sont tes munitions pour pouvoir
                  faire tapis sur la VAR en direct — et viser le Bunker 0-0 si le match sent la naphtaline.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/login"
              className="flex h-14 items-center justify-center rounded-2xl bg-green-500 px-10 font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(34,197,94,0.4)] transition hover:bg-green-400 hover:shadow-[0_0_45px_rgba(34,197,94,0.55)] active:scale-[0.97]"
            >
              Entrer en jeu →
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
            Installe VAR Time sur ton mobile. Chaque match devient ton terrain d&apos;instincts.
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
          GRADES KOP — progression (vitrine)
      ═══════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-[clamp(1.35rem,4vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
            Ton expertise au kop.
          </h2>
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-green-500/40 bg-zinc-900/50 p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)] backdrop-blur-sm sm:p-8">
            <p className="text-center text-sm leading-relaxed text-zinc-400">
              Passe d&rsquo;arbitre du dimanche ignoré de tous au rang de Boss de la VAR en enchaînant les bons
              verdicts.
            </p>
            <ol className="relative mt-8 list-none space-y-0 p-0">
              <KopRankStep
                step={1}
                label="Arbitre de District"
                variant="muted"
                isLast={false}
              />
              <KopRankStep step={2} label="Sifflet de Bronze" variant="bronze" isLast={false} />
              <KopRankStep step={3} label="Sifflet d&rsquo;Argent" variant="silver" isLast={false} />
              <KopRankStep step={4} label="Boss de la VAR" variant="gold" isLast />
            </ol>
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
          VAR Time est un jeu gratuit de simulation. Tu ne mises aucun argent réel et tu n&apos;en gagnes pas.
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
  violet: {
    border:  "border-zinc-800 hover:border-violet-500/40",
    glow:    "bg-violet-500/8",
    icon:    "text-violet-400",
    shadow:  "hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
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

function KopRankStep({
  step,
  label,
  variant,
  isLast,
}: {
  step: number;
  label: string;
  variant: "muted" | "bronze" | "silver" | "gold";
  isLast: boolean;
}) {
  const circle =
    variant === "muted"
      ? "border-zinc-700 bg-zinc-800/80 text-zinc-500"
      : variant === "bronze"
        ? "border-amber-600/70 bg-gradient-to-br from-amber-950/80 to-zinc-900 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        : variant === "silver"
          ? "border-zinc-400/50 bg-gradient-to-br from-zinc-600/30 to-zinc-900 text-zinc-200 shadow-[0_0_18px_rgba(212,212,216,0.12)]"
          : "border-amber-300/80 bg-gradient-to-br from-amber-400/25 to-yellow-600/20 text-amber-100 shadow-[0_0_28px_rgba(250,204,21,0.35)]";

  const labelClass =
    variant === "muted"
      ? "text-zinc-500"
      : variant === "bronze"
        ? "bg-gradient-to-r from-amber-700 via-orange-500 to-amber-500 bg-clip-text font-black text-transparent"
        : variant === "silver"
          ? "bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 bg-clip-text font-black text-transparent"
          : "inline-block bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 bg-[length:200%_100%] bg-clip-text font-black text-transparent animate-[shimmer_2.5s_linear_infinite]";

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast ? (
        <div
          className="absolute left-[17px] top-9 h-[calc(100%-0.25rem)] w-px bg-gradient-to-b from-green-500/35 to-green-500/5"
          aria-hidden
        />
      ) : null}
      <div
        className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${circle}`}
      >
        {step}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-bold tracking-tight sm:text-base ${labelClass}`}>{label}</p>
      </div>
    </li>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-52 max-w-full sm:w-56">
      <div
        className="absolute inset-0 -m-6 rounded-[3.5rem] bg-green-500/15 blur-3xl"
        aria-hidden
      />
      {/* Coque : ratio smartphone moderne (~9:19.5), contenu fluide sans étirement */}
      <div className="relative flex aspect-[9/19.5] w-full flex-col overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(34,197,94,0.08)]">
        {/* Notch */}
        <div className="flex shrink-0 items-center justify-center border-b border-zinc-800 py-2">
          <div className="h-1.5 w-14 rounded-full bg-zinc-700" />
        </div>

        {/* Écran — remplit la hauteur restante, pas de déformation du contenu */}
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 bg-zinc-950 p-2.5 pb-3">
          <div className="min-h-0 shrink-0 space-y-1.5">
            {/* Scoreboard */}
            <div className="overflow-hidden rounded-xl bg-zinc-900">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[9px] font-black text-white">PSG</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">1</span>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-black text-white">0</span>
                </div>
                <span className="text-[9px] font-black text-white">OL</span>
              </div>
              <div className="bg-green-500/10 px-2.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-green-400">47&rsquo; EN DIRECT</span>
              </div>
            </div>

            {/* Event */}
            <div className="px-0.5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                Décision en cours
              </p>
              <p className="text-[0.8rem] font-black leading-tight text-white">Il y a péno là&nbsp;?!</p>
            </div>

            {/* Timer */}
            <div>
              <div className="mb-1 flex justify-between text-[8px]">
                <span className="text-zinc-500">Temps restant</span>
                <span className="font-black text-white">67s</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-3/4 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          <div className="min-h-0 shrink-0 space-y-1.5">
            {/* OUI / NON */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex min-h-0 flex-col items-center justify-center rounded-xl border-2 border-green-500 bg-green-500/15 py-2">
                <span className="text-[8px] font-black uppercase text-green-400">OUI</span>
                <span className="text-xs font-black text-green-400">×2.00</span>
              </div>
              <div className="flex min-h-0 flex-col items-center justify-center rounded-xl border-2 border-zinc-600 bg-zinc-800 py-2">
                <span className="text-[8px] font-black uppercase text-zinc-300">NON</span>
                <span className="text-xs font-black text-zinc-400">×1.80</span>
              </div>
            </div>

            {/* Engagement */}
            <div className="flex items-center rounded-lg bg-zinc-800/80 px-2 py-1.5">
              <span className="text-[8px] text-zinc-500">Engagement</span>
              <span className="ml-auto text-[10px] font-black text-white">50 pts</span>
              <span className="ml-1 text-[8px] text-green-400">→ +100</span>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-center rounded-xl bg-green-500 py-2">
              <span className="text-[8px] font-black uppercase tracking-wide text-zinc-950">
                Valider ma prédiction →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE badge */}
      <div className="absolute -right-4 top-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[9px] font-black text-white">LIVE</span>
      </div>

      {/* Notification bubble — mobile only */}
      <div className="absolute -left-6 bottom-[12%] max-w-[130px] rounded-2xl border border-white/10 bg-zinc-800 px-3 py-2 shadow-[0_0_20px_rgba(34,197,94,0.15)] lg:hidden">
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
