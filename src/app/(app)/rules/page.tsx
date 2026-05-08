import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export const metadata = { title: "Règles du jeu — VAR Time" };

const PRONO_RULES = [
  {
    emoji: "🎯",
    title: "Le Vainqueur (1 / N / 2)",
    body: "Pronostique la bonne issue (victoire domicile, nul, victoire extérieur) avant le coup d'envoi. Tu gagnes des Points indexés sur les vraies cotes du marché : plus le résultat est improbable, plus ça rapporte. La formule asymptotique plafonne les gains à 220 Points maximum pour préserver l'économie du jeu.",
  },
  {
    emoji: "💎",
    title: "Le Score Exact & la Prime Contre-Pied",
    body: "Dépasse l'issue et vise le score pile. Si tu es dans le bon camp ET que peu de joueurs ont trouvé ce score exact parmi ceux ayant la bonne issue, tu décroches la prime Contre-Pied : +10 Points (> 40%), +30 Points (Joli Coup), +60 Points (Le Visionnaire), ou +100 Points (💎 Le Braquage — moins de 5% !). Le but : surprendre la communauté.",
  },
  {
    emoji: "⚽",
    title: "Les Buteurs",
    body: "Nomme un ou plusieurs buteurs avant le match. Chaque buteur trouvé rapporte des Points selon la cote réelle du joueur — les défenseurs et milieux rapportent plus que les attaquants attendus. Les cotes sont calculées avec une formule asymptotique plafonnée à 150 Points par buteur, cumulables.",
  },
];

const LIVE_RULES = [
  {
    emoji: "🚨",
    title: "Le système Waze — Signaler une action",
    body: "Pendant le match, si tu repères une action litigieuse (penalty, hors-jeu VAR, carton…), appuie sur le bouton correspondant. Si assez de joueurs confirment en moins de 30 secondes, un marché de paris s'ouvre automatiquement. Le seuil est dynamique : sur un petit match peu fréquenté, 1 seul signal suffit. Sur un gros match, il en faut davantage pour éviter le spam.",
  },
  {
    emoji: "⏱️",
    title: "La fenêtre de 90 secondes",
    body: "Tu as 90 secondes pour miser des Sifflets sur OUI (l'arbitre valide) ou NON (décision inversée). Passé ce délai, les paris sont fermés et on attend le verdict.",
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
    title: "Pronos + Paris VAR = ton score de la semaine",
    body: "Ton « score » hebdomadaire cumule deux sources : tes points de pronos (score exact, buteurs) ET tes gains nets sur les paris VAR en direct (OUI/NON). Tout ce que tu gagnes pendant la semaine compte — régularité avant match ET flair en live.",
  },
  {
    emoji: "🏆",
    title: "Victoire, Nul, Défaite",
    body: "À la fin de la semaine, le joueur avec le plus de Points pronos remporte le « match ». Victoire = 3 Points au classement, Match nul (égalité) = 1 Point chacun, Défaite = 0 Point. En cas d'égalité parfaite dans le classement général, les Points pronos totaux servent de goal average.",
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

      {/* Section Saisons */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🗓️</span> Saisons Mensuelles
        </h2>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🔄
              </span>
              <div>
                <h3 className="font-black text-white">
                  Chaque mois, un nouveau départ
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Tous les 1ers du mois, le classement saisonnier est figé et
                  archivé. Les Sifflets gagnés sont reportés à 10 % dans la
                  nouvelle saison pour donner à tous une vraie chance de briller
                  — peu importe quand tu rejoins.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🏆
              </span>
              <div>
                <h3 className="font-black text-white">Hall of Fame immuable</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Ton total de points cumulés (toutes saisons confondues)
                  n&apos;est jamais effacé. Il alimente ton Hall of Fame
                  personnel — une trace permanente de toutes tes performances.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🎖️
              </span>
              <div>
                <h3 className="font-black text-white">
                  Rangs de fin de saison
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  À la clôture de chaque saison : Champion (1er), Top 3, Top 10,
                  Participant. Ces rangs sont archivés dans ton profil pour
                  l&apos;éternité.
                </p>
              </div>
            </div>
          </div>
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

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-white">
          <span>⚡</span>
          <span>Boosters</span>
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm leading-relaxed text-zinc-400">
            Les boosters sont des power-ups tactiques achetables avec des
            Sifflets.{" "}
            <span className="font-black text-white">
              1 seul booster par pari maximum.
            </span>
          </p>
          {[
            {
              emoji: "💎",
              name: "Double XP",
              cost: "300 🪙",
              desc: "Pari/prono gagnant → 2× les Points.",
            },
            {
              emoji: "📈",
              name: "Cote+",
              cost: "200 🪙",
              desc: "Ta récompense potentielle +20%.",
            },
            {
              emoji: "🛡️",
              name: "Filet de Sécurité",
              cost: "500 🪙",
              desc: "Si tu perds, tu récupères 50% de ta mise.",
            },
            {
              emoji: "👁️",
              name: "Vision",
              cost: "100 🪙",
              desc: "Révèle les pronos détaillés de tes amis sur un match.",
            },
          ].map((b) => (
            <div key={b.name} className="flex items-start gap-3">
              <span className="text-xl">{b.emoji}</span>
              <div>
                <p className="text-sm font-black text-white">
                  {b.name}{" "}
                  <span className="font-normal text-zinc-500">· {b.cost}</span>
                </p>
                <p className="text-[11px] text-zinc-500">{b.desc}</p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-zinc-600 pt-1">
            Les boosters ne modifient pas le résultat — uniquement ta
            récompense. Aucun pay-to-win.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🎚️</span> Mises Minimum
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
          <p className="mb-3 text-sm leading-relaxed text-zinc-400">
            La mise minimum augmente avec ton solde pour garder le jeu
            stimulant. Plus tu accumules de Sifflets, plus tu dois risquer pour
            parier.
          </p>
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-zinc-800">
                  <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Solde
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Mise min.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { range: "< 5 000 🪙", min: "5 🪙" },
                  { range: "5 000 – 19 999 🪙", min: "50 🪙" },
                  { range: "20 000 – 49 999 🪙", min: "200 🪙" },
                  { range: "50 000 – 99 999 🪙", min: "500 🪙" },
                  { range: "≥ 100 000 🪙", min: "1 000 🪙" },
                ].map((tier) => (
                  <tr key={tier.range}>
                    <td className="px-4 py-2 text-zinc-400">{tier.range}</td>
                    <td className="px-4 py-2 text-right font-black text-amber-400">
                      {tier.min}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-white">
          <span>🛒</span>
          <span>Boutique</span>
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            Dépense tes Sifflets pour personnaliser ton arbitre — avatars
            premium, bordures animées, effets de pari visibles par tous.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            <span className="font-black text-white">
              Aucun achat avec de l&apos;argent réel, jamais.
            </span>{" "}
            Les Sifflets se gagnent uniquement en jouant. Certains cosmétiques
            sont débloqués automatiquement en atteignant un rang — achète-les
            avant si tu es impatient.
          </p>
        </div>
      </section>
    </main>
  );
}
