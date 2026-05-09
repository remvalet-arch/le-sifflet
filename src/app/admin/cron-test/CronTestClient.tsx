"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react";

const CRONS = [
  {
    id: "j1-inactive",
    label: "J+1 inactif",
    description: "Push aux users sans prono après 24h",
    emoji: "👋",
  },
  {
    id: "j3-inactive",
    label: "J+3 inactif",
    description: "Email « ligue CDM réservée » aux inactifs",
    emoji: "📧",
  },
  {
    id: "j7-churn",
    label: "J+7 churn",
    description: "Email Tally feedback aux users qui ont décroché",
    emoji: "🙏",
  },
  {
    id: "daily-digest",
    label: "Daily Digest",
    description: "Push + email bilan du jour aux users actifs hier",
    emoji: "📊",
  },
  {
    id: "weekly-recap",
    label: "Weekly Recap",
    description: "Email récap 7 jours (normalement le dimanche)",
    emoji: "📅",
  },
] as const;

type CronId = (typeof CRONS)[number]["id"];
type Status = "idle" | "loading" | "ok" | "error";

export function CronTestClient() {
  const [statuses, setStatuses] = useState<Record<CronId, Status>>(
    () =>
      Object.fromEntries(CRONS.map((c) => [c.id, "idle"])) as Record<
        CronId,
        Status
      >,
  );
  const [results, setResults] = useState<Record<CronId, string | null>>(
    () =>
      Object.fromEntries(CRONS.map((c) => [c.id, null])) as Record<
        CronId,
        string | null
      >,
  );

  async function run(cronId: CronId) {
    setStatuses((prev) => ({ ...prev, [cronId]: "loading" }));
    setResults((prev) => ({ ...prev, [cronId]: null }));

    try {
      const res = await fetch("/api/admin/test-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron: cronId }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStatuses((prev) => ({ ...prev, [cronId]: "error" }));
        setResults((prev) => ({
          ...prev,
          [cronId]: json.error ?? "Erreur inconnue",
        }));
        toast.error(json.error ?? "Erreur cron");
        return;
      }

      setStatuses((prev) => ({ ...prev, [cronId]: "ok" }));
      const result = json.data?.result;
      const summary =
        result && typeof result === "object"
          ? JSON.stringify(result.data ?? result)
          : "OK";
      setResults((prev) => ({ ...prev, [cronId]: summary }));
      toast.success(`Cron « ${cronId} » exécuté !`);

      setTimeout(
        () => setStatuses((prev) => ({ ...prev, [cronId]: "idle" })),
        5000,
      );
    } catch {
      setStatuses((prev) => ({ ...prev, [cronId]: "error" }));
      toast.error("Erreur réseau");
    }
  }

  return (
    <div className="space-y-3">
      {CRONS.map((c) => {
        const status = statuses[c.id];
        const result = results[c.id];
        return (
          <button
            key={c.id}
            type="button"
            disabled={status === "loading"}
            onClick={() => run(c.id)}
            className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
              status === "ok"
                ? "border-green-500/40 bg-green-500/10"
                : status === "error"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-white/8 bg-zinc-900 hover:border-white/20 hover:bg-zinc-800"
            }`}
          >
            <span className="text-2xl">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">{c.label}</p>
              <p className="text-xs text-zinc-500">{c.description}</p>
              {result && (
                <p
                  className={`mt-1 truncate font-mono text-xs ${
                    status === "error" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {result}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : status === "ok" ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : status === "error" ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Play className="h-4 w-4 text-zinc-500" />
              )}
            </div>
          </button>
        );
      })}

      <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-400">
        ⚠️ Ces boutons exécutent les crons pour vrai — des emails et push réels
        seront envoyés aux users éligibles.
      </p>
    </div>
  );
}
