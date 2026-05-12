"use client";

import { useState } from "react";
import { toast } from "sonner";
import { log } from "@/lib/logger";
import { track } from "@/lib/analytics";

interface VisionBoosterButtonProps {
  eventId: string;
  hasVisionBooster: boolean;
  onActivated: (hints: Record<string, number>) => void;
}

export function VisionBoosterButton({
  eventId,
  hasVisionBooster,
  onActivated,
}: VisionBoosterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  if (!hasVisionBooster || activated) return null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/boosters/activate-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { friend_choices: Record<string, number>; match_id?: string };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Erreur inconnue");
        return;
      }
      setActivated(true);
      const friendChoices = json.data?.friend_choices ?? {};
      const friendCount = Object.values(friendChoices).reduce(
        (sum, n) => sum + n,
        0,
      );
      track("vision_booster_activated", {
        match_id: json.data?.match_id ?? "",
        market_id: eventId,
        friend_choices_count: friendCount,
      });
      onActivated(friendChoices);
    } catch (err) {
      log.error("VisionBoosterButton", "activation failed", { error: err });
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => void handleActivate()}
        disabled={loading}
        aria-label="Activer le booster Vision pour révéler les choix de tes amis"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-400 transition hover:bg-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <span className="animate-pulse">Activation…</span>
        ) : (
          <>👁️ Activer Vision</>
        )}
      </button>
    </div>
  );
}
