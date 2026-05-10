"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { PlayerForSelect } from "./ScorerAllocationEditor";
import {
  SCORER_DEFAULT_ODDS,
  SCORER_MAX_POINTS,
  convertOddToPoints,
} from "@/lib/odds";

function getScorerPts(player: PlayerForSelect): number | null {
  if (player.player_name === "CSC") return null;
  const odd =
    player.odd_anytime ?? SCORER_DEFAULT_ODDS[player.position ?? ""] ?? null;
  if (!odd) return null;
  return convertOddToPoints(odd, SCORER_MAX_POINTS);
}

/** Detects client-side rendering without triggering set-state-in-effect. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function PlayerAvatar({ player }: { player: PlayerForSelect }) {
  if (player.player_name === "CSC") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm font-black text-red-400">
        CSC
      </div>
    );
  }
  const img = player.cutout_url || player.image_url;
  if (img) {
    return (
      <Image
        src={img}
        alt={player.player_name}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full border border-white/5 bg-zinc-800 object-cover"
      />
    );
  }
  const init = player.player_name.substring(0, 2).toUpperCase();
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/5 bg-zinc-800 text-sm font-bold text-zinc-400">
      {init}
    </div>
  );
}

export function PlayerPickerSheet({
  open,
  onClose,
  onSelect,
  playersList,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
  playersList: PlayerForSelect[];
  title?: string;
}) {
  const t = useTranslations("Pronos");
  const tMatch = useTranslations("Match");
  const isClient = useIsClient();
  const [search, setSearch] = useState("");

  function getPosLabel(pos: string | null | undefined): string {
    if (pos === "G") return tMatch("posGK");
    if (pos === "D") return tMatch("posDEF");
    if (pos === "M") return tMatch("posMID");
    if (pos === "A") return tMatch("posFWD");
    return "";
  }

  // Lock body scroll while sheet is open (pure DOM side-effect — no setState)
  useEffect(() => {
    if (!isClient) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isClient]);

  if (!isClient) return null;

  const q = search.toLowerCase();
  const filtered = playersList.filter((p) =>
    p.player_name.toLowerCase().includes(q),
  );

  const csc = filtered.filter((p) => p.player_name === "CSC");
  const att = filtered.filter((p) => p.position === "A");
  const mil = filtered.filter((p) => p.position === "M");
  const def = filtered.filter((p) => p.position === "D");
  const gk = filtered.filter((p) => p.position === "G");

  const sections = [
    { label: null, players: csc },
    { label: t("posFWD"), players: att },
    { label: t("posMID"), players: mil },
    { label: t("posDEF"), players: def },
    { label: t("posGK"), players: gk },
  ].filter((s) => s.players.length > 0);

  function handleClose() {
    setSearch("");
    onClose();
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/70 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col rounded-t-3xl bg-zinc-900 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "80vh", maxHeight: "620px" }}
      >
        {/* Handle */}
        <div className="flex shrink-0 items-center justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 py-2">
          <span className="text-sm font-black text-chalk">
            {title ?? t("playerPickerTitle")}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 active:bg-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            aria-label={t("playerPickerSearch")}
            placeholder={t("playerPickerSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Player list */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
          }}
        >
          {filtered.length === 0 ? (
            <p className="pt-10 text-center text-sm text-zinc-500">
              {t("playerPickerNoResults")}
            </p>
          ) : (
            sections.map((section, si) => (
              <div key={si}>
                {section.label && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {section.label}
                  </p>
                )}
                {section.players.map((p) => (
                  <button
                    key={p.player_name}
                    type="button"
                    onClick={() => {
                      onSelect(p.player_name);
                      handleClose();
                    }}
                    className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left transition active:bg-white/5"
                  >
                    <PlayerAvatar player={p} />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-white">
                        {p.player_name}
                      </span>
                      {p.player_name !== "CSC" && p.position && (
                        <span className="text-xs text-zinc-500">
                          {getPosLabel(p.position)}
                        </span>
                      )}
                    </div>
                    {getScorerPts(p) !== null && (
                      <span className="ml-auto shrink-0 rounded-full bg-whistle/10 px-2 py-0.5 text-xs font-bold text-whistle">
                        ~{getScorerPts(p)} pts
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
