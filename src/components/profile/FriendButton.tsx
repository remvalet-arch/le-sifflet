"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { log } from "@/lib/logger";

export function FriendButton({
  profileId,
  currentUserId,
}: {
  profileId: string;
  currentUserId: string;
}) {
  const t = useTranslations("Profile");
  const [status, setStatus] = useState<"none" | "pending" | "accepted">("none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadStatus() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("friend_requests")
        .select("id, status")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentUserId})`,
        )
        .maybeSingle();

      if (data) {
        setStatus(data.status as "pending" | "accepted");
        setRequestId(data.id);
      }
      setLoading(false);
    }
    void loadStatus();
  }, [profileId, currentUserId, supabase]);

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: profileId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { id: string };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? t("friendRequestError"));
      } else {
        toast.success(t("friendRequestSent"));
        setStatus("pending");
        setRequestId(json.data?.id ?? null);
      }
    } catch (err) {
      log.error("FriendButton", "handleAdd fetch error", {
        error: String(err),
      });
      toast.error(t("friendRequestError"));
    }
    setLoading(false);
  }

  async function handleRemove() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/friend-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? t("friendRemoveError"));
      } else {
        setStatus("none");
        setRequestId(null);
      }
    } catch (err) {
      log.error("FriendButton", "handleRemove fetch error", {
        error: String(err),
      });
      toast.error(t("friendRemoveError"));
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <button
        disabled
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-bold text-zinc-500"
      >
        {t("friendLoading")}
      </button>
    );
  }

  if (status === "accepted") {
    return (
      <button
        onClick={handleRemove}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500/20 py-3 text-sm font-bold text-green-400 transition hover:bg-red-500/20 hover:text-red-400 group"
      >
        <span className="group-hover:hidden flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> {t("friendAccepted")}
        </span>
        <span className="hidden group-hover:flex items-center gap-2">
          <UserMinus className="h-4 w-4" /> {t("friendRemove")}
        </span>
      </button>
    );
  }

  if (status === "pending") {
    return (
      <button
        disabled
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 py-3 text-sm font-bold text-zinc-400"
      >
        <Clock className="h-4 w-4" /> {t("friendPending")}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-whistle py-3 text-sm font-black uppercase tracking-wide text-pitch-900 transition hover:brightness-110 active:scale-[0.98]"
    >
      <UserPlus className="h-4 w-4" />
      {t("friendAdd")}
    </button>
  );
}
