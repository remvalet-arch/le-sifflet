"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, CheckCircle, XCircle, Loader2 } from "lucide-react";

const SCENARIOS = [
  {
    id: "generic",
    label: "Générique",
    description: "Simple vérification que le canal fonctionne",
    emoji: "🔔",
  },
  {
    id: "match_imminent",
    label: "Match imminent",
    description: "Notification « dans 5 min » avec lien match",
    emoji: "🔴",
  },
  {
    id: "reminder_2h",
    label: "Rappel 2h",
    description: "Rappel avant coup d'envoi avec lien pronos",
    emoji: "⏰",
  },
  {
    id: "var_event",
    label: "Événement VAR",
    description: "Alerte pari ouvert en live",
    emoji: "🚨",
  },
  {
    id: "win",
    label: "Pari gagné",
    description: "Notification de gain avec crédits",
    emoji: "🎉",
  },
  {
    id: "daily_digest",
    label: "Digest quotidien",
    description: "Récap du jour avec stats",
    emoji: "📋",
  },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]["id"];
type Status = "idle" | "loading" | "ok" | "error";

export function PushTestClient({
  userId,
  subscriptionCount,
}: {
  userId: string;
  subscriptionCount: number;
}) {
  const [statuses, setStatuses] = useState<Record<ScenarioId, Status>>(
    () =>
      Object.fromEntries(SCENARIOS.map((s) => [s.id, "idle"])) as Record<
        ScenarioId,
        Status
      >,
  );

  async function send(scenario: ScenarioId) {
    setStatuses((prev) => ({ ...prev, [scenario]: "loading" }));

    try {
      const res = await fetch("/api/admin/test-push-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStatuses((prev) => ({ ...prev, [scenario]: "error" }));
        toast.error(json.error ?? "Erreur push");
        return;
      }

      setStatuses((prev) => ({ ...prev, [scenario]: "ok" }));
      toast.success(
        json.data.sent > 0
          ? `Push « ${scenario} » envoyé !`
          : `Subscription trouvée mais push non livré.`,
      );

      // Reset after 3s
      setTimeout(
        () => setStatuses((prev) => ({ ...prev, [scenario]: "idle" })),
        3000,
      );
    } catch {
      setStatuses((prev) => ({ ...prev, [scenario]: "error" }));
      toast.error("Erreur réseau");
    }
  }

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="rounded-xl border border-white/8 bg-zinc-900 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Compte cible
        </p>
        <p className="mt-1 font-mono text-sm text-white">{userId}</p>
        <div className="mt-3 flex items-center gap-2">
          {subscriptionCount > 0 ? (
            <>
              <CheckCircle className="size-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">
                {subscriptionCount} subscription
                {subscriptionCount > 1 ? "s" : ""} active
                {subscriptionCount > 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <XCircle className="size-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">
                Aucune subscription. Active les notifs dans Paramètres.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scenario grid */}
      <div className="grid gap-3">
        {SCENARIOS.map((s) => {
          const status = statuses[s.id];
          return (
            <button
              key={s.id}
              type="button"
              disabled={subscriptionCount === 0 || status === "loading"}
              onClick={() => send(s.id)}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
                status === "ok"
                  ? "border-green-500/40 bg-green-500/10"
                  : status === "error"
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-white/8 bg-zinc-900 hover:border-white/20 hover:bg-zinc-800"
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-xs text-zinc-500">{s.description}</p>
              </div>
              <div className="shrink-0">
                {status === "loading" ? (
                  <Loader2 className="size-4 animate-spin text-zinc-400" />
                ) : status === "ok" ? (
                  <CheckCircle className="size-4 text-green-400" />
                ) : status === "error" ? (
                  <XCircle className="size-4 text-red-400" />
                ) : (
                  <Send className="size-4 text-zinc-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {subscriptionCount === 0 && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center text-xs font-semibold text-amber-400">
          Pour tester, accepte les notifications dans{" "}
          <a href="/settings" className="underline">
            Paramètres
          </a>{" "}
          d&apos;abord.
        </p>
      )}
    </div>
  );
}
