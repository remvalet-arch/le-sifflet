"use client";

import { useState } from "react";
import { toast } from "sonner";

type ResolveResult = {
  pronoMatchesFound: number;
  pronoMatchesResolved: number;
  ltbMatchesFound: number;
  ltbMatchesResolved: number;
  openVarEventsOnFinishedMatches: number;
  errors: string[];
};

export function ForceResolvePastMatchesButton() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ResolveResult | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/force-resolve-past-matches", {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: ResolveResult;
        error?: string;
      };
      if (!json.ok || !json.data) {
        toast.error(json.error ?? "Erreur lors du rattrapage");
        return;
      }
      const d = json.data;
      setLastResult(d);
      const total = d.pronoMatchesResolved + d.ltbMatchesResolved;
      if (total === 0 && d.pronoMatchesFound === 0 && d.ltbMatchesFound === 0) {
        toast.success("Tout est déjà à jour, rien à rattraper !");
      } else if (d.errors.length > 0) {
        toast.error(`${total} résolu(s), mais ${d.errors.length} erreur(s)`);
      } else {
        toast.success(
          `${total} match(s) résolus — ${d.pronoMatchesResolved} pronos, ${d.ltbMatchesResolved} paris long terme`,
        );
      }
    } catch {
      toast.error("Erreur réseau, réessaie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-whistle px-4 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:brightness-110 disabled:opacity-40"
      >
        {loading
          ? "Rattrapage en cours…"
          : "⚡ Rattraper les matchs non résolus"}
      </button>

      {lastResult && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 space-y-1">
          <p>
            <span className="text-white font-bold">Pronos :</span>{" "}
            {lastResult.pronoMatchesResolved}/{lastResult.pronoMatchesFound}{" "}
            match(s) résolus
          </p>
          <p>
            <span className="text-white font-bold">Paris long terme :</span>{" "}
            {lastResult.ltbMatchesResolved}/{lastResult.ltbMatchesFound}{" "}
            match(s) résolus
          </p>
          {lastResult.openVarEventsOnFinishedMatches > 0 && (
            <p className="text-yellow-400">
              ⚠ {lastResult.openVarEventsOnFinishedMatches} event(s) VAR encore
              ouverts sur des matchs terminés — à résoudre manuellement
              ci-dessus
            </p>
          )}
          {lastResult.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-400">
                {lastResult.errors.length} erreur(s)
              </summary>
              <ul className="mt-1 space-y-0.5 text-red-300">
                {lastResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
