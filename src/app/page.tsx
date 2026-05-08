import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CircleDollarSign,
  DoorOpen,
  Globe2,
  Shuffle,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "VAR Time — La VAR, mais en jeu",
  description:
    "Pronostique en temps réel sur les décisions d'arbitre, grimpe au classement et braque tes potes dans tes ligues privées. 100% gratuit.",
};

type LandingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  const sp = await searchParams;
  const oauthError =
    sp.error === "oauth"
      ? decodeURIComponent(
          typeof sp.message === "string"
            ? sp.message.replace(/_/g, " ")
            : "Connexion Google échouée.",
        )
      : null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_rgba(22,163,74,0.07)_0%,_transparent_55%)] text-white">
      {oauthError && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-900/80 px-4 py-2.5 text-sm font-bold text-red-300 shadow-xl backdrop-blur-sm">
          ⚠️ {oauthError}
        </div>
      )}
      {/* ── Nav ── */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pb-4 pt-6 sm:px-8">
        {/* VAR TIME logo — geste carré VAR */}
        <div className="flex items-center gap-2.5">
          <span className="rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-black tracking-widest text-white">
            VAR
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-white">
            TIME
          </span>
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
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 5px)",
          }}
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
                textShadow:
                  "0 0 80px rgba(251,191,36,0.35), 0 0 30px rgba(251,191,36,0.15)",
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
            Tu regardes le match. VAR TIME te prévient.{" "}
            <span className="font-bold text-white">
              1 tap pour parier sur la VAR avant l&rsquo;arbitre.
            </span>
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
            Gratuit · Monnaie fictive (Sifflets) · Aucun argent réel · PWA
            mobile
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
              <p className="text-[9px] font-bold text-zinc-500">
                Alerte communauté
              </p>
              <p className="text-[12px] font-black text-white">
                Penalty&nbsp;?
              </p>
            </div>

            {/* Floating card 2 */}
            <div
              className="absolute -right-10 bottom-28 hidden rounded-xl border border-green-500/20 bg-zinc-900/95 px-3 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.2)] lg:block"
              style={{ animation: "float 5s ease-in-out 1s infinite" }}
            >
              <p className="text-[9px] font-bold text-zinc-500">
                Prédiction juste
              </p>
              <p className="text-[13px] font-black text-green-400">+500 Pts</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          GRADES KOP — progression (vitrine) — position 2
      ═══════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-[clamp(1.35rem,4vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
            Ton expertise au kop.
          </h2>
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-green-500/40 bg-zinc-900/50 p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)] backdrop-blur-sm sm:p-8">
            <p className="text-center text-sm leading-relaxed text-zinc-400">
              Passe d&rsquo;arbitre du dimanche ignoré de tous au rang de Boss
              de la VAR en enchaînant les bons verdicts.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <span className="text-xl">🗓️</span>
              <p className="text-sm text-zinc-400">
                <span className="font-black text-white">
                  Saisons mensuelles
                </span>{" "}
                — Chaque mois, un nouveau champion est couronné. Tu démarres
                avec une vraie chance, peu importe quand tu rejoins.
              </p>
            </div>
            <ol className="relative mt-8 list-none space-y-0 p-0">
              <KopRankStep
                step={1}
                label="Arbitre de District"
                variant="muted"
                isLast={false}
              />
              <KopRankStep
                step={2}
                label="Sifflet de Bronze"
                variant="bronze"
                isLast={false}
              />
              <KopRankStep
                step={3}
                label="Sifflet d&rsquo;Argent"
                variant="silver"
                isLast={false}
              />
              <KopRankStep
                step={4}
                label="Boss de la VAR"
                variant="gold"
                isLast
              />
            </ol>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BOUTIQUE — Cosmétiques
      ═══════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-[clamp(1.35rem,4vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
            Affiche ton style.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-400">
            Collectionne avatars, bordures animées et effets de pari exclusifs
            en jouant. Visible par tous tes amis et dans les ligues.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {[
              { emoji: "🦁", label: "Lion Bronze", desc: "Rang Bronze" },
              { emoji: "👑", label: "Couronne", desc: "3 000 pts" },
              { emoji: "💎", label: "Diamant Noir", desc: "1 500 pts" },
              { emoji: "🦅", label: "Aigle Boss", desc: "Rang Boss" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex w-28 flex-col items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900 p-4"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[11px] font-black text-white">
                  {item.label}
                </span>
                <span className="text-[10px] text-zinc-500">{item.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Monnaie virtuelle uniquement — aucun achat réel, jamais.
          </p>
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
              title="Ligues"
              body="Mode Classique ou Championnat 1vs1 : invite tes potes, génère un calendrier complet, et prouve chaque semaine que tu es le meilleur pronostiqueur du vestiaire."
            />
            <GamePanel
              step="04"
              Icon={Shuffle}
              color="violet"
              title="Le Contre-Pied"
              body="Oublie les cotes ennuyeuses. Trouve le score exact ou les buteurs que personne n'a vus venir, et rafle la mise. L'audace paie en Sifflets."
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
              body="Tu crées ton compte, tu ouvres ton vestiaire : tu rejoins une ligue privée ou tu lances la tienne avec un code d'invitation."
            />
            <div className="md:-translate-y-4">
              <GamePanel
                step="02"
                Icon={CircleDollarSign}
                color="yellow"
                title="Sifflets"
                body="Les points gagnés (Sifflets) s'adaptent dynamiquement aux vraies cotes des matchs. C'est ton trésor de guerre pour miser quand la VAR s'ouvre."
              />
            </div>
            <GamePanel
              step="03"
              Icon={Swords}
              color="blue"
              title="Braquage ou 1vs1"
              body="Pronostique en direct contre la communauté quand la VAR s'ouvre — ou lance un Championnat 1vs1 dans ta ligue et affronte un pote différent chaque semaine."
            />
          </div>

          {/* Pronostics avant match — carte pleine largeur */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 p-6 shadow-[0_0_50px_rgba(16,185,129,0.12)] backdrop-blur-sm sm:p-8 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10">
              <div className="relative mx-auto h-36 w-56 shrink-0 md:mx-0">
                <div
                  className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/20 blur-3xl"
                  aria-hidden
                />
                {/* Profile screen (behind) */}
                <div className="absolute right-0 top-3 w-28 rotate-6 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-emerald-500/30" />
                    <div className="space-y-0.5">
                      <div className="h-1 w-10 rounded bg-zinc-700" />
                      <div className="h-1 w-6 rounded bg-zinc-600" />
                    </div>
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="mb-0.5 flex items-center justify-between rounded bg-zinc-800 px-1.5 py-1"
                    >
                      <div className="h-1 w-8 rounded bg-zinc-700" />
                      <div
                        className={`h-1 w-4 rounded ${i === 0 ? "bg-green-500/60" : "bg-zinc-600"}`}
                      />
                    </div>
                  ))}
                </div>
                {/* Lobby screen (front) */}
                <div className="absolute left-0 top-0 w-28 -rotate-3 overflow-hidden rounded-xl border border-green-500/20 bg-zinc-900 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(34,197,94,0.1)]">
                  <div className="mb-1.5 flex gap-1">
                    {["L1", "PL", "UCL"].map((tab, i) => (
                      <span
                        key={tab}
                        className={`rounded px-1.5 py-0.5 text-[6px] font-black ${i === 0 ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500"}`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="mb-1 overflow-hidden rounded-lg bg-zinc-800 p-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-1 w-8 rounded bg-zinc-600" />
                        {i === 0 && (
                          <span className="text-[5px] font-black text-red-400">
                            ● LIVE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h3 className="text-[clamp(1.35rem,4.5vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
                  Pas qu&rsquo;un excité du direct.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  Fais tes pronos d&rsquo;avant-match (score, buteurs) pour
                  gagner des{" "}
                  <strong className="font-bold text-zinc-200">Sifflets</strong>.
                  Ce sont tes munitions pour pouvoir faire tapis sur la VAR en
                  direct — et viser le Bunker 0-0 si le match sent la
                  naphtaline.
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
          PWA INSTALL — LAND-2
      ═══════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/8 bg-zinc-900/60 p-6 text-center sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/8 px-3 py-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-400">
                PWA · 100% gratuit · Aucun compte requis pour découvrir
              </span>
            </div>
            <h2 className="text-[clamp(1.4rem,4vw,2rem)] font-black uppercase leading-tight tracking-tight text-white">
              Pas d&rsquo;App Store.
              <br />
              <span className="text-green-400">
                3 secondes et c&rsquo;est installé.
              </span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
              Ajoute VAR TIME à ton écran d&rsquo;accueil directement depuis{" "}
              <strong className="text-white">Safari</strong> ou{" "}
              <strong className="text-white">Chrome</strong> — aucun
              téléchargement, aucune mise à jour manuelle.
            </p>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-left">
              {[
                {
                  icon: "🍎",
                  step: "iPhone",
                  desc: "Safari → Partager → Sur l'écran d'accueil",
                },
                {
                  icon: "🤖",
                  step: "Android",
                  desc: "Chrome → Menu ⋮ → Ajouter à l'écran d'accueil",
                },
              ].map(({ icon, step, desc }) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/8 bg-zinc-900 p-4"
                >
                  <span className="text-2xl">{icon}</span>
                  <p className="mt-2 text-xs font-black text-white">{step}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-2xl bg-green-500 px-8 font-black uppercase tracking-wide text-black shadow-[0_0_25px_rgba(34,197,94,0.35)] transition hover:bg-green-400 active:scale-95"
            >
              Ouvrir VAR TIME →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CDM 2026 COUNTDOWN — LAND-3
      ═══════════════════════════════════════════ */}
      <CdmCountdown />

      {/* ═══════════════════════════════════════════
          FAQ — LAND-4
      ═══════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <h2 className="mb-8 text-center text-[clamp(1.3rem,4vw,1.8rem)] font-black uppercase leading-tight tracking-tight text-white">
            ❓ Tout ce que tu te demandes
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-white/8 bg-zinc-900"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 px-5 py-4 text-sm font-black text-white [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="shrink-0 text-zinc-500 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">
                  {a}
                </p>
              </details>
            ))}
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
          <a
            href="/cgu"
            className="text-[10px] text-zinc-700 transition hover:text-zinc-500"
          >
            CGU
          </a>
          <span className="text-zinc-800">•</span>
          <a
            href="/mentions-legales"
            className="text-[10px] text-zinc-700 transition hover:text-zinc-500"
          >
            Mentions Légales
          </a>
          <span className="text-zinc-800">•</span>
          <a
            href="/privacy"
            className="text-[10px] text-zinc-700 transition hover:text-zinc-500"
          >
            Confidentialité
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-sm px-4 text-[9px] text-zinc-700">
          VAR Time est un jeu gratuit de simulation. Tu ne mises aucun argent
          réel et tu n&apos;en gagnes pas.
        </p>
      </footer>
    </main>
  );
}

// ── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "C'est quoi VAR TIME ?",
    a: "VAR TIME est un jeu de pronostics en temps réel autour du football. Quand une décision d'arbitre est contestée (penalty, hors-jeu VAR, carton), la communauté l'anticipe et parie des Sifflets — notre monnaie virtuelle 100% fictive.",
  },
  {
    q: "C'est gratuit ?",
    a: "Oui, entièrement gratuit. Tu ne dépenses aucun argent réel et tu n'en gagnes pas. Les Sifflets sont une monnaie de jeu sans valeur monétaire.",
  },
  {
    q: "Ça marche sur iPhone ?",
    a: "Oui. VAR TIME est une PWA (Progressive Web App). Depuis Safari, appuie sur Partager puis \"Sur l'écran d'accueil\" pour l'installer en 3 secondes. Aucun App Store requis.",
  },
  {
    q: "Je peux perdre de l'argent ?",
    a: "Non. VAR TIME utilise des Sifflets, une monnaie fictive interne au jeu. Aucune transaction financière n'est possible. C'est un jeu de simulation, pas de paris d'argent.",
  },
  {
    q: "C'est légal ?",
    a: "Oui. VAR TIME est un jeu de simulation avec monnaie virtuelle fictive. Il ne constitue pas un service de paris d'argent au sens de la loi et n'est pas régulé par l'ANJ.",
  },
  {
    q: "Comment inviter mes potes ?",
    a: "Crée une ligue privée depuis l'onglet Ligues, copie le lien d'invitation et partage-le. Tes potes rejoignent en un clic, sans compte préalable.",
  },
] as const;

// ── CDM Countdown (server component, date calculée à la requête) ──────────────

function CdmCountdown() {
  const cdm = new Date("2026-06-11T14:00:00Z");
  // eslint-disable-next-line react-hooks/purity
  const diff = cdm.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  return (
    <section className="border-t border-white/8 py-14">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-zinc-900/80 p-8">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/70">
            ⚽ La CDM 2026 commence bientôt
          </p>
          <div className="my-4 text-7xl font-black leading-none tracking-tight text-white">
            J&#8209;{daysLeft}
          </div>
          <p className="text-sm text-zinc-400">
            Le premier match de la Coupe du Monde 2026 est le{" "}
            <strong className="text-white">11 juin 2026</strong>. Inscris-toi
            maintenant pour ne pas rater le coup d&rsquo;envoi.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-8 font-black uppercase tracking-wide text-zinc-900 shadow-[0_0_30px_rgba(251,191,36,0.3)] transition hover:bg-amber-300 active:scale-95"
          >
            Je m&rsquo;inscris →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Composants internes ───────────────────────────────────────────────────────

const PANEL_STYLES = {
  green: {
    border: "border-zinc-800 hover:border-green-500/40",
    glow: "bg-green-500/8",
    icon: "text-green-400",
    shadow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.07)]",
  },
  yellow: {
    border: "border-zinc-800 hover:border-yellow-500/40",
    glow: "bg-yellow-500/8",
    icon: "text-yellow-400",
    shadow: "hover:shadow-[0_0_30px_rgba(250,204,21,0.07)]",
  },
  blue: {
    border: "border-zinc-800 hover:border-blue-500/40",
    glow: "bg-blue-500/8",
    icon: "text-blue-400",
    shadow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.07)]",
  },
  violet: {
    border: "border-zinc-800 hover:border-violet-500/40",
    glow: "bg-violet-500/8",
    icon: "text-violet-400",
    shadow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
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
      <p
        className={`mb-2 text-[9px] font-black uppercase tracking-widest ${s.icon}`}
      >
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
        <p
          className={`text-sm font-bold tracking-tight sm:text-base ${labelClass}`}
        >
          {label}
        </p>
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
      <div className="relative flex aspect-[9/19.5] w-full flex-col overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-zinc-900 shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(34,197,94,0.08)]">
        {/* Notch */}
        <div className="flex shrink-0 items-center justify-center border-b border-zinc-800 py-2">
          <div className="h-1.5 w-14 rounded-full bg-zinc-700" />
        </div>

        {/* Écran — lobby */}
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-white/20 px-1 text-[7px] font-black text-white">
                VAR
              </span>
              <span className="text-[8px] font-black text-white">TIME</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-zinc-700" />
          </div>

          {/* League tabs */}
          <div className="flex shrink-0 gap-1 overflow-hidden border-b border-zinc-800 px-2.5 py-1.5">
            {["L1", "PL", "UCL", "ESP"].map((tab, i) => (
              <span
                key={tab}
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black ${i === 0 ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500"}`}
              >
                {tab}
              </span>
            ))}
          </div>

          {/* Match list */}
          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2">
            {/* Match LIVE */}
            <div className="overflow-hidden rounded-xl bg-zinc-900 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[7px] font-black text-red-400">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-red-400" />
                  LIVE
                </span>
                <span className="text-[7px] text-zinc-500">67&rsquo;</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-white">PSG</span>
                <span className="text-[10px] font-black text-white">1 – 0</span>
                <span className="text-[8px] font-black text-white">OL</span>
              </div>
            </div>

            {/* Match upcoming 1 */}
            <div className="overflow-hidden rounded-xl bg-zinc-900 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[7px] text-zinc-500">20:45</span>
                <span className="text-[7px] text-zinc-600">Premier Lge</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-white">MAN C</span>
                <span className="text-[8px] font-bold text-zinc-500">vs</span>
                <span className="text-[8px] font-black text-white">ARS</span>
              </div>
            </div>

            {/* Match upcoming 2 */}
            <div className="overflow-hidden rounded-xl bg-zinc-900 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[7px] text-zinc-500">21:00</span>
                <span className="text-[7px] text-zinc-600">UCL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-white">REAL</span>
                <span className="text-[8px] font-bold text-zinc-500">vs</span>
                <span className="text-[8px] font-black text-white">BARÇA</span>
              </div>
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
