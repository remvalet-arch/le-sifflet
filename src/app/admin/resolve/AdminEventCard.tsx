"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MarketEventRow } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  penalty: "Péno",
  offside: "Hors-jeu",
  card: "Carton",
};

type Props = {
  event: MarketEventRow;
  matchName: string;
  ageMin: number;
};

export function AdminEventCard({ event, matchName, ageMin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function forceResolve(result: "oui" | "non") {
    setLoading(result);
    try {
      const res = await fetch("/api/admin/resolve-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, result }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success(
        `Résolu : ${result.toUpperCase()} — les gains sont distribués !`,
      );
      router.refresh();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLoading(null);
    }
  }

  async function autoVerify() {
    setLoading("auto");
    try {
      const res = await fetch("/api/verify-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { status: string; result?: string };
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      const status = json.data?.status;
      if (status === "resolved") {
        toast.success(
          `Auto-résolu : ${json.data?.result?.toUpperCase()} — gains distribués !`,
        );
        router.refresh();
      } else if (status === "too_early") {
        toast.info(`Trop tôt — event âgé de ${ageMin} min (min. 3 min)`);
      } else {
        toast.info("API externe : données pas encore disponibles");
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
          <p className="font-black text-white">{matchName}</p>
          <p className="text-xs text-white/40">
            il y a {ageMin} min · {event.id.slice(0, 8)}…
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => forceResolve("oui")}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "oui" ? "…" : "✅ OUI"}
        </button>
        <button
          onClick={() => forceResolve("non")}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "non" ? "…" : "❌ NON"}
        </button>
        <button
          onClick={autoVerify}
          disabled={!!loading}
          className="flex-1 rounded-xl border border-yellow-400/40 py-2 text-sm font-bold text-yellow-400 transition hover:bg-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "auto" ? "…" : "🤖 Auto"}
        </button>
      </div>
    </div>
  );
}
