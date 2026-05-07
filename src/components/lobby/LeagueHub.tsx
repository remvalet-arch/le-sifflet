"use client";

import { useState } from "react";
import { TopPlayersList } from "@/components/lobby/TopPlayersList";

type HubTabId = "scorers" | "assists";

const HUB_TABS: { id: HubTabId; label: string }[] = [
  { id: "scorers", label: "Buteurs" },
  { id: "assists", label: "Passeurs" },
];

export function LeagueHub({
  leagueApiId,
}: {
  leagueApiId: number;
  /** Conservé pour compatibilité avec les appelants existants, non utilisé. */
  initialRound?: string | null;
}) {
  const [hubTab, setHubTab] = useState<HubTabId>("scorers");

  return (
    <div className="flex flex-col gap-4">
      {/* Sous-onglets */}
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-white/8 pb-3"
        aria-label="Hub de statistiques"
      >
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setHubTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              hubTab === t.id
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Buteurs ──────────────────────────────────────────────────────────── */}
      {hubTab === "scorers" && (
        <TopPlayersList leagueApiId={leagueApiId} type="scorer" />
      )}

      {/* ── Passeurs ─────────────────────────────────────────────────────────── */}
      {hubTab === "assists" && (
        <TopPlayersList leagueApiId={leagueApiId} type="assist" />
      )}
    </div>
  );
}
