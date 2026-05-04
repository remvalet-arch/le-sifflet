"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MatchSubscriptionRow } from "@/types/database";

type Props = {
  matchId: string;
};

type ApiRes = { ok: boolean; data?: { smart_mute: boolean }; error?: string };

/**
 * Abonnement match (match_subscriptions) : cloche pour suivre les alertes / futurs push.
 * Cycle : non abonné → abonné · abonné → mute · mute → réactiver les notifs.
 */
export function MatchNotificationBell({ matchId }: Props) {
  const supabase = createClient();
  const [row, setRow] = useState<Pick<
    MatchSubscriptionRow,
    "smart_mute"
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("match_subscriptions")
      .select("smart_mute")
      .eq("match_id", matchId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("[MatchNotificationBell]", error.message);
          setRow(null);
        } else {
          setRow(data);
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [matchId, supabase]);

  async function runIntent(intent: "subscribe" | "mute" | "unmute") {
    setPending(true);
    try {
      const res = await fetch("/api/match-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, intent }),
      });
      const json = (await res.json()) as ApiRes;
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Action impossible");
        return;
      }
      if (intent === "subscribe") {
        toast.success("Tu suis ce match — on te tient au courant !");
      } else if (intent === "mute") {
        toast.success("Notifs en sourdine pour ce match");
      } else {
        toast.success("Notifs réactivées pour ce match");
      }
      await refreshRow();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setPending(false);
    }
  }

  async function refreshRow() {
    const { data, error } = await supabase
      .from("match_subscriptions")
      .select("smart_mute")
      .eq("match_id", matchId)
      .maybeSingle();
    if (error) {
      console.error("[MatchNotificationBell]", error.message);
      setRow(null);
    } else {
      setRow(data);
    }
  }

  function handlePress() {
    if (pending || loading) return;
    if (!row) void runIntent("subscribe");
    else if (!row.smart_mute) void runIntent("mute");
    else void runIntent("unmute");
  }

  const subscribed = Boolean(row);
  const muted = row?.smart_mute === true;

  let label = "S'abonner aux notifications de ce match";
  if (subscribed && !muted) label = "Mettre en sourdine (garder l'abonnement)";
  if (muted) label = "Réactiver les notifications";

  return (
    <button
      type="button"
      onClick={() => {
        handlePress();
      }}
      disabled={loading || pending}
      aria-label={label}
      aria-pressed={subscribed && !muted}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:opacity-40 ${
        muted
          ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
          : subscribed
            ? "border-green-500/50 bg-green-500/15 text-green-400"
            : "border-white/15 bg-zinc-900/80 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
      }`}
    >
      {loading || pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      ) : muted ? (
        <BellOff className="h-5 w-5" aria-hidden />
      ) : (
        <Bell
          className={`h-5 w-5 ${subscribed ? "fill-current" : ""}`}
          aria-hidden
        />
      )}
    </button>
  );
}
