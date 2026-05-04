export const metadata = { title: "Règles du jeu" };

const RULES = [
  {
    number: "01",
    title: "Les alertes — Le système Waze",
    body: "Quand tu vois une action litigieuse (penalty, carton, hors-jeu…), appuie sur le bouton correspondant. Si plusieurs joueurs confirment en moins de 30 secondes, un marché de prédictions s'ouvre automatiquement pour tout le monde dans la room.",
  },
  {
    number: "02",
    title: "Les prédictions",
    body: "Tu as 90 secondes pour engager des Pts sur OUI ou NON. Le multiplicateur est dégressif dans le temps : plus tu prédis tôt, plus ta récompense potentielle est élevée. Passé le délai, les prédictions sont fermées et on attend l'arbitre.",
  },
  {
    number: "03",
    title: "Le score de confiance (Karma)",
    body: "Chaque alerte que tu déclenches a des conséquences sur ton score. Alerte confirmée par l'arbitre (OUI) : +10 points de confiance et +50 Pts. Fausse alerte (NON) : −20 points. Sous 50 points, tes alertes sont ignorées silencieusement.",
  },
  {
    number: "04",
    title: "Le classement",
    body: "Accumule un maximum de Pts en prédisant juste et en lançant de bonnes alertes. Le top 50 est affiché sur la page Classement. Les joueurs avec plus de 150 points de confiance affichent un badge Modérateur.",
  },
  {
    number: "05",
    title: "Le bonus quotidien",
    body: "Si ton solde tombe sous 500 Pts, tu peux récupérer +500 Pts toutes les 24 heures depuis ta page Profil. Personne n'est bloqué indéfiniment — mais les mauvaises alertes ont un coût.",
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white">
        Règles du jeu
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Simple, rapide, fair-play.</p>

      <div className="mt-6 flex flex-col gap-4">
        {RULES.map((rule) => (
          <div
            key={rule.number}
            className="rounded-2xl border border-white/8 bg-zinc-900 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="shrink-0 rounded-lg bg-green-500/15 px-2 py-1 text-sm font-black tabular-nums text-green-500">
                {rule.number}
              </span>
              <div>
                <h2 className="font-black text-white">{rule.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {rule.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
