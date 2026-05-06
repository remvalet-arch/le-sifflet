"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Check, X, ChevronRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type FriendRequestRow = Database["public"]["Tables"]["friend_requests"]["Row"];

type FriendRequest = FriendRequestRow & {
  sender: { id: string; username: string; avatar_url: string | null };
  receiver: { id: string; username: string; avatar_url: string | null };
};

function AvatarCircle({
  avatarUrl,
  username,
  size = "md",
}: {
  avatarUrl: string | null;
  username: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  const colors = [
    "bg-emerald-500/20 text-emerald-400",
    "bg-blue-500/20 text-blue-400",
    "bg-purple-500/20 text-purple-400",
    "bg-amber-500/20 text-amber-400",
    "bg-red-500/20 text-red-400",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];

  if (avatarUrl && avatarUrl.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={username}
        className={`${dim} rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${color} flex shrink-0 items-center justify-center rounded-full font-black`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export function AmisContent({ currentUserId }: { currentUserId: string }) {
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let alive = true;

    async function loadFriends() {
      const { data, error } = await supabase
        .from("friend_requests")
        .select(
          `
          id, status, sender_id, receiver_id, created_at, updated_at,
          sender:profiles!sender_id(id, username, avatar_url),
          receiver:profiles!receiver_id(id, username, avatar_url)
        `,
        )
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (!error && data && alive) {
        setFriends(data as unknown as FriendRequest[]);
      }
      if (alive) setLoading(false);
    }

    void loadFriends();

    const channel = supabase
      .channel(`friend-requests-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          void loadFriends();
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  async function handleAction(id: string, action: "accepted" | "rejected") {
    if (action === "rejected") {
      await supabase.from("friend_requests").delete().eq("id", id);
    } else {
      await supabase
        .from("friend_requests")
        .update({ status: action })
        .eq("id", id);
    }
    setFriends((prev) =>
      action === "rejected"
        ? prev.filter((f) => f.id !== id)
        : prev.map((f) => (f.id === id ? { ...f, status: action } : f)),
    );
    toast.success(
      action === "accepted" ? "Demande acceptée" : "Demande refusée",
    );
  }

  if (loading) {
    return (
      <div className="text-center text-sm text-zinc-500 py-10">
        Chargement des amis...
      </div>
    );
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter(
    (f) => f.status === "pending" && f.receiver_id === currentUserId,
  );

  return (
    <div className="space-y-5">
      <Link
        href="/ligues"
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3.5 transition hover:bg-emerald-500/12"
      >
        <Trophy className="h-5 w-5 shrink-0 text-emerald-400" />
        <div className="flex-1">
          <p className="text-sm font-black text-white">
            Retrouve tes amis dans les ligues
          </p>
          <p className="text-[11px] text-zinc-500">
            Rejoins une ligue pour défier tes potes 🏆
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </Link>

      {pendingReceived.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Demandes reçues
            </h3>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">
              {pendingReceived.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingReceived.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <AvatarCircle
                    avatarUrl={req.sender.avatar_url}
                    username={req.sender.username}
                  />
                  <span className="font-black text-white">
                    {req.sender.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(req.id, "accepted")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20 text-green-400 transition hover:bg-green-500/30"
                    aria-label="Accepter"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "rejected")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
                    aria-label="Refuser"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Amis ({accepted.length})
        </h3>
        {accepted.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-10 text-center">
            <Users className="h-10 w-10 text-zinc-600" />
            <div>
              <p className="text-sm font-bold text-zinc-400">
                Aucun ami pour l&apos;instant
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Explore les ligues pour en trouver !
              </p>
            </div>
            <Link
              href="/ligues"
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-800 px-4 py-2 text-xs font-black text-white transition hover:bg-zinc-700"
            >
              <Trophy className="h-3.5 w-3.5" />
              Explorer les ligues
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {accepted.map((req) => {
              const friend =
                req.sender_id === currentUserId ? req.receiver : req.sender;
              return (
                <Link
                  key={req.id}
                  href={`/profile/${friend.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/6 bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800"
                >
                  <AvatarCircle
                    avatarUrl={friend.avatar_url}
                    username={friend.username}
                  />
                  <span className="flex-1 font-black text-white">
                    {friend.username}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
