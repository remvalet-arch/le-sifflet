export const metadata = { title: "Lois du Jeu — VAR Time" };

const VAR_SITUATIONS = [
  {
    number: "01",
    title: "But valide ou non",
    subtitle: "Faute · Hors-jeu · Main",
    body: "La VAR intervient pour vérifier si un but doit être accordé ou refusé. Cela inclut les fautes dans l'action menant au but, les positions de hors-jeu, et les touches de main involontaires ou délibérées dans la phase d'attaque.",
    color: "green" as const,
  },
  {
    number: "02",
    title: "Penalty accordé ou refusé",
    subtitle: "Faute · Main · Position",
    body: "Toute décision d'accorder ou de refuser un penalty dans la surface de réparation peut faire l'objet d'une révision. La VAR contrôle également si les joueurs respectaient les limites de la surface au moment du tir.",
    color: "yellow" as const,
  },
  {
    number: "03",
    title: "Carton rouge direct",
    subtitle: "Hors faute grossière ou comportement violent",
    body: "Les cartons rouges directs (non les deuxièmes jaunes) peuvent être revus : tacles dangereux, brutalité, crachats, morsures. Un jaune attribué à tort peut être upgradé, mais la VAR ne revoit pas les doubles avertissements.",
    color: "red" as const,
  },
  {
    number: "04",
    title: "Erreur d'identité",
    subtitle: "Mauvais joueur sanctionné",
    body: "Si l'arbitre sanctionne le mauvais joueur — carton ou expulsion — la VAR corrige l'identité. Ce cas reste rare mais est couvert par le protocole officiel IFAB depuis 2018.",
    color: "blue" as const,
  },
];

const PRINCIPLES = [
  { label: "Erreur claire et évidente", body: "La VAR n'intervient que pour les erreurs manifestes. Un arbitre ne peut pas être contredit pour des jugements subjectifs." },
  { label: "Décision finale à l'arbitre", body: "La VAR recommande, l'arbitre tranche. Il peut aller consulter l'écran bord-terrain (OFR — On Field Review) pour décider lui-même." },
  { label: "Célébration suspendue", body: "Par protocole, les joueurs doivent attendre la validation de la VAR avant de célébrer un but. L'arbitre lève la main pour signaler la vérification." },
];

export default function LawsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            Protocole IFAB / FIFA
          </span>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Lois du Jeu VAR
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Les 4 situations officielles où l&rsquo;assistance vidéo peut intervenir.
        </p>
      </div>

      {/* 4 situations */}
      <div className="flex flex-col gap-4">
        {VAR_SITUATIONS.map((s) => {
          const accent =
            s.color === "green"  ? { border: "border-green-500/25",  bg: "bg-green-500/10",  text: "text-green-400",  badge: "bg-green-500/15"  } :
            s.color === "yellow" ? { border: "border-yellow-500/25", bg: "bg-yellow-500/10", text: "text-yellow-400", badge: "bg-yellow-500/15" } :
            s.color === "red"    ? { border: "border-red-500/25",    bg: "bg-red-500/10",    text: "text-red-400",    badge: "bg-red-500/15"    } :
                                   { border: "border-blue-500/25",   bg: "bg-blue-500/10",   text: "text-blue-400",   badge: "bg-blue-500/15"   };
          return (
            <div
              key={s.number}
              className={`overflow-hidden rounded-2xl border bg-zinc-900 ${accent.border}`}
            >
              <div className={`px-5 py-3 ${accent.bg}`}>
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${accent.badge} ${accent.text}`}>
                    {s.number}
                  </span>
                  <div>
                    <p className={`text-sm font-black ${accent.text}`}>{s.title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Principes clés */}
      <div className="mt-8">
        <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Principes clés du protocole
        </h2>
        <div className="flex flex-col gap-3">
          {PRINCIPLES.map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-white/8 bg-zinc-900/60 px-5 py-4"
            >
              <p className="mb-1 text-sm font-black text-white">{p.label}</p>
              <p className="text-sm leading-relaxed text-zinc-500">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Source */}
      <p className="mt-8 text-center text-[10px] text-zinc-700">
        Source : Lois du Jeu IFAB édition 2024/25 — Protocole VAR FIFA
      </p>
    </main>
  );
}
