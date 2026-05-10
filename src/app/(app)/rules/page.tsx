import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const revalidate = 86400;

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("rules") };
}

export default async function RulesPage() {
  const t = await getTranslations("Rules");

  const PRONO_RULES = [
    { emoji: "🎯", title: t("pronoWinnerTitle"), body: t("pronoWinnerBody") },
    { emoji: "💎", title: t("pronoScoreTitle"), body: t("pronoScoreBody") },
    { emoji: "⚽", title: t("pronoScorersTitle"), body: t("pronoScorersBody") },
  ];

  const LIVE_RULES = [
    { emoji: "🚨", title: t("liveWazeTitle"), body: t("liveWazeBody") },
    { emoji: "⏱️", title: t("liveWindowTitle"), body: t("liveWindowBody") },
    {
      emoji: "⚖️",
      title: t("liveParimutelTitle"),
      body: t("liveParimutelBody"),
    },
    {
      emoji: "🌍",
      title: t("liveGlobalPotTitle"),
      body: t("liveGlobalPotBody"),
    },
    { emoji: "🤝", title: t("liveKarmaTitle"), body: t("liveKarmaBody") },
  ];

  const CHAMPIONSHIP_RULES = [
    {
      emoji: "📅",
      title: t("championshipAdversaryTitle"),
      body: t("championshipAdversaryBody"),
    },
    {
      emoji: "🎯",
      title: t("championshipScoreTitle"),
      body: t("championshipScoreBody"),
    },
    {
      emoji: "🏆",
      title: t("championshipVictoryTitle"),
      body: t("championshipVictoryBody"),
    },
    {
      emoji: "🔒",
      title: t("championshipClosedTitle"),
      body: t("championshipClosedBody"),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-4">
      {/* Header avec bouton retour */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/lobby"
          aria-label={t("backToLobby")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-green-500" />
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            {t("title")}
          </h1>
        </div>
      </div>

      {/* Section Pronos */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🎯</span> {t("sectionPronos")}
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
          <span>🚨</span> {t("sectionLiveRoom")}
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
          <span>🗓️</span> {t("sectionSeasons")}
        </h2>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🔄
              </span>
              <div>
                <h3 className="font-black text-white">
                  {t("seasonNewStartTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {t("seasonNewStartBody")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🏆
              </span>
              <div>
                <h3 className="font-black text-white">
                  {t("seasonHallOfFameTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {t("seasonHallOfFameBody")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-xl" aria-hidden>
                🎖️
              </span>
              <div>
                <h3 className="font-black text-white">
                  {t("seasonRanksTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {t("seasonRanksBody")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Championnat 1v1 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>⚔️</span> {t("sectionChampionship")}
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
          <span>{t("sectionBoosters")}</span>
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm leading-relaxed text-zinc-400">
            {t("boostersIntro")}{" "}
            <span className="font-black text-white">{t("boostersOneMax")}</span>
          </p>
          {[
            {
              emoji: "💎",
              name: t("boosterDoubleXpName"),
              cost: t("boosterDoubleXpCost"),
              desc: t("boosterDoubleXpDesc"),
            },
            {
              emoji: "📈",
              name: t("boosterCotePlusName"),
              cost: t("boosterCotePlusCost"),
              desc: t("boosterCotePlusDesc"),
            },
            {
              emoji: "🛡️",
              name: t("boosterSafetyNetName"),
              cost: t("boosterSafetyNetCost"),
              desc: t("boosterSafetyNetDesc"),
            },
            {
              emoji: "👁️",
              name: t("boosterVisionName"),
              cost: t("boosterVisionCost"),
              desc: t("boosterVisionDesc"),
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
            {t("boostersDisclaimer")}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>🎚️</span> {t("sectionMinBets")}
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
          <p className="mb-3 text-sm leading-relaxed text-zinc-400">
            {t("minBetsIntro")}
          </p>
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-zinc-800">
                  <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {t("minBetsBalance")}
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {t("minBetsMin")}
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
          <span>{t("sectionShop")}</span>
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            {t("shopIntro")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            <span className="font-black text-white">
              {t("shopNoRealMoney")}
            </span>{" "}
            {t("shopCosmetics")}
          </p>
        </div>
      </section>
    </main>
  );
}
