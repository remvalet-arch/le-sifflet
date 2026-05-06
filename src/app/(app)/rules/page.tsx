import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export const metadata = { title: "Règles du jeu — VAR Time" };

const PRONO_RULES = [
  {
    emoji: "🎯",
    title: "Le Vainqueur (1 / N / 2)",
    body: "Pronostique la bonne issue (victoire domicile, nul, victoire extérieur) avant le coup d'envoi. Tu gagnes des points indexés sur les vraies cotes du marché : plus le résultat est improbable, plus ça rapporte. La formule asymptotique plafonne les gains à 220 pts maximum pour préserver l'économie du jeu.",
  },
  {
    emoji: "💎",
    title: "Le Score Exact & la Prime Contre-Pied",
    body: "Dépasse l'issue et vise le score pile. Si tu es dans le bon camp ET que peu de joueurs ont trouvé ce score exact parmi ceux ayant la bonne issue, tu décroches la prime Contre-Pied : +10 pts (> 40%), +30 pts (Joli Coup), +60 pts (Le Visionnaire), ou +100 pts (💎 Le Braquage — moins de 5% !). Le but : surprendre la communauté.",
  },
  {
    emoji: "⚽",
    title: "Les Buteurs",
    body: "Nomme un ou plusieurs buteurs avant le match. Chaque buteur trouvé rapporte des Pts selon la cote réelle du joueur — les défenseurs et milieux rapportent plus que les attaquants attendus. Les cotes sont calculées avec une formule asymptotique plafonnée à 150 pts par buteur, cumulables.",
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
    emoji: "🌍",
    title: "Le Pot Commun Global",
    body: "Tu joues contre le reste de l'application, pas seulement tes amis. Les Sifflets des joueurs de toute la communauté qui se trompent financent les gains de ceux qui ont le bon flair. Les ligues privées, c'est pour le classement et le chambrage — le pot, lui, est global.",
  },
  {
    emoji: "🤝",
    title: "Score de confiance (Karma)",
    body: "Chaque alerte que tu déclenches impacte ton score de confiance. Alerte vraie (OUI) : +2 pts. Fausse alerte (NON) : −5 pts. Si ton score tombe trop bas, tes alertes sont ignorées silencieusement par le système.",
  },
];

const CHAMPIONSHIP_RULES = [
  {
    emoji: "📅",
    title: "Un adversaire par semaine",
    body: "En mode 1vs1, le propriétaire de la ligue génère un calendrier round-robin complet (aller + retour). Chaque semaine, tu es automatiquement opposé à un membre différent. Le planning est calculé dès le lancement du championnat.",
  },
  {
    emoji: "🎯",
    title: "Tes points pronos = ton score du match",
    body: "Ton « score » hebdomadaire correspond à la somme des points gagnés via tes pronos (score exact, buteurs) sur tous les matchs de la semaine. Pas de paris VAR ici : c'est la régularité de tes pronostics qui fait la différence.",
  },
  {
    emoji: "🏆",
    title: "Victoire, Nul, Défaite",
    body: "À la fin de la semaine, le joueur avec le plus de points pronos remporte le « match ». Victoire = 3 pts au classement, Match nul (égalité) = 1 pt chacun, Défaite = 0 pt. En cas d'égalité parfaite dans le classement général, les points pronos totaux servent de goal average.",
  },
  {
    emoji: "🔒",
    title: "La ligue se ferme au lancement",
    body: "Dès que le championnat est lancé, plus aucun joueur ne peut rejoindre la ligue. Le nombre de membres doit être pair (2 à 18) pour que le calendrier soit équilibré.",
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
      <section className="mb-6">
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

      {/* Section Championnat 1v1 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>⚔️</span> Le Mode Championnat 1vs1
        </h2>
        <div className="flex flex-col gap-3">
          {CHAMPIONSHIP_RULES.map((rule) => (
            <div
              key={rule.title}
              className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4"
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
