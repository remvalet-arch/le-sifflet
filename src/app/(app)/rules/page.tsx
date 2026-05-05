import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export const metadata = { title: "Règles du jeu — VAR Time" };

const PRONO_RULES = [
  {
    emoji: "🎯",
    title: "Score exact",
    body: "Pronostique le score final avant le coup d'envoi. Si tu trouves la bonne issue (victoire / nul / défaite), tu gagnes 50 Pts de base — même sans le score pile.",
  },
  {
    emoji: "💎",
    title: "La Prime de Contre-Pied",
    body: "Si tu devines le score exact ET que peu de joueurs l'avaient vu venir, tu décroches la prime Contre-Pied : +10 pts (> 40% des bons 1N2 avaient ce score), +30 pts (Joli Coup), +60 pts (Le Visionnaire), ou +100 pts (💎 Le Braquage — moins de 5% l'avaient prédit !).",
  },
  {
    emoji: "⚽",
    title: "Buteurs",
    body: "Parie sur un ou plusieurs buteurs avant le match. Chaque buteur trouvé rapporte des Pts selon sa position : Attaquant (~107 Pts), Milieu (~129 Pts), Défenseur (~138 Pts). Les cotes sont calculées avec une formule asymptotique : plus le buteur est improbable, plus le gain est élevé.",
  },
  {
    emoji: "🛡️",
    title: "Bunker 0-0",
    body: "Le cas extrême : si tu pronostiques un match nul 0-0 et que tu as raison, tu déclenches la récompense Bunker — la plus haute de la gamme Score Exact.",
  },
];

const LIVE_RULES = [
  {
    emoji: "🚨",
    title: "Le système Waze — Signaler une action",
    body: "Pendant le match, si tu repères une action litigieuse (penalty, hors-jeu VAR, carton…), appuie sur le bouton correspondant. Si assez de joueurs confirment en moins de 30 secondes, un marché de paris s'ouvre automatiquement dans la room.",
  },
  {
    emoji: "⏱️",
    title: "La fenêtre de 90 secondes",
    body: "Tu as 90 secondes pour miser des Pts sur OUI (l'arbitre valide) ou NON (décision inversée). Passé ce délai, les paris sont fermés et on attend le verdict.",
  },
  {
    emoji: "⚖️",
    title: "Cotes Parimutuel (~Cote)",
    body: "Les cotes ne sont pas fixes : elles bougent en temps réel en fonction des mises de tous les joueurs. Plus de monde sur OUI → la cote OUI baisse. C'est le pari mutuel, comme en hippisme. La cote affichée est une estimation (~Cote) jusqu'à la fermeture.",
  },
  {
    emoji: "🏴‍☠️",
    title: "Le Braquage de Ligue",
    body: "Si tu es dans une ligue privée, les Pts perdus par les membres qui ont tort reviennent en bonus aux membres qui ont raison sur le même événement. Le pot de la ligue est redistribué entre les gagnants.",
  },
  {
    emoji: "🤝",
    title: "Score de confiance (Karma)",
    body: "Chaque alerte que tu déclenches impacte ton score de confiance. Alerte vraie (OUI) : +2 pts. Fausse alerte (NON) : −5 pts. Si ton score tombe trop bas, tes alertes sont ignorées silencieusement par le système.",
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-4">
      {/* Header avec bouton retour */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/lobby"
          aria-label="Retour au lobby"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-green-500" />
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            Règles du jeu
          </h1>
        </div>
      </div>

      {/* Section Pronos */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🎯</span> Les Pronos (Score &amp; Buteurs)
        </h2>
        <div className="flex flex-col gap-3">
          {PRONO_RULES.map((rule) => (
            <div
              key={rule.title}
              className="rounded-2xl border border-white/8 bg-zinc-900 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-xl" aria-hidden>
                  {rule.emoji}
                </span>
                <div>
                  <h3 className="font-black text-white">{rule.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {rule.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section LiveRoom */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🚨</span> La LiveRoom (Paris VAR)
        </h2>
        <div className="flex flex-col gap-3">
          {LIVE_RULES.map((rule) => (
            <div
              key={rule.title}
              className="rounded-2xl border border-white/8 bg-zinc-900 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-xl" aria-hidden>
                  {rule.emoji}
                </span>
                <div>
                  <h3 className="font-black text-white">{rule.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {rule.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
