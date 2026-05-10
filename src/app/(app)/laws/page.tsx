import { getTranslations } from "next-intl/server";

export const revalidate = 86400;

export const metadata = { title: "Lois du Jeu — VAR Time" };

export default async function LawsPage() {
  const t = await getTranslations("Laws");

  const VAR_SITUATIONS = [
    {
      number: t("sit01Number"),
      title: t("sit01Title"),
      subtitle: t("sit01Subtitle"),
      body: t("sit01Body"),
      color: "green" as const,
    },
    {
      number: t("sit02Number"),
      title: t("sit02Title"),
      subtitle: t("sit02Subtitle"),
      body: t("sit02Body"),
      color: "yellow" as const,
    },
    {
      number: t("sit03Number"),
      title: t("sit03Title"),
      subtitle: t("sit03Subtitle"),
      body: t("sit03Body"),
      color: "red" as const,
    },
    {
      number: t("sit04Number"),
      title: t("sit04Title"),
      subtitle: t("sit04Subtitle"),
      body: t("sit04Body"),
      color: "blue" as const,
    },
  ];

  const PRINCIPLES = [
    { label: t("principle01Label"), body: t("principle01Body") },
    { label: t("principle02Label"), body: t("principle02Body") },
    { label: t("principle03Label"), body: t("principle03Body") },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            {t("protocol")}
          </span>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
      </div>

      {/* 4 situations */}
      <div className="flex flex-col gap-4">
        {VAR_SITUATIONS.map((s) => {
          const accent =
            s.color === "green"
              ? {
                  border: "border-green-500/25",
                  bg: "bg-green-500/10",
                  text: "text-green-400",
                  badge: "bg-green-500/15",
                }
              : s.color === "yellow"
                ? {
                    border: "border-yellow-500/25",
                    bg: "bg-yellow-500/10",
                    text: "text-yellow-400",
                    badge: "bg-yellow-500/15",
                  }
                : s.color === "red"
                  ? {
                      border: "border-red-500/25",
                      bg: "bg-red-500/10",
                      text: "text-red-400",
                      badge: "bg-red-500/15",
                    }
                  : {
                      border: "border-blue-500/25",
                      bg: "bg-blue-500/10",
                      text: "text-blue-400",
                      badge: "bg-blue-500/15",
                    };
          return (
            <div
              key={s.number}
              className={`overflow-hidden rounded-2xl border bg-zinc-900 ${accent.border}`}
            >
              <div className={`px-5 py-3 ${accent.bg}`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${accent.badge} ${accent.text}`}
                  >
                    {s.number}
                  </span>
                  <div>
                    <p className={`text-sm font-black ${accent.text}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-zinc-400">
                  {s.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Principes clés */}
      <div className="mt-8">
        <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {t("keyPrinciples")}
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
        {t("source")}
      </p>
    </main>
  );
}
