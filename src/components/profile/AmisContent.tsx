"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type FriendRequestRow = Database["public"]["Tables"]["friend_requests"]["Row"];

type FriendRequest = FriendRequestRow & {
  sender: { id: string; username: string; avatar_url: string | null };
  receiver: { id: string; username: string; avatar_url: string | null };
};

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
    <div className="space-y-6">
      {pendingReceived.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-black uppercase text-zinc-500">
            Demandes reçues
          </h3>
          <div className="flex flex-col gap-2">
            {pendingReceived.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 text-center leading-8">
                    {req.sender.avatar_url || "👤"}
                  </div>
                  <span className="font-bold text-white">
                    {req.sender.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(req.id, "accepted")}
                    className="rounded-full bg-green-500/20 p-2 text-green-400"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "rejected")}
                    className="rounded-full bg-red-500/20 p-2 text-red-400"
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
        <h3 className="mb-3 text-xs font-black uppercase text-zinc-500">
          Amis
        </h3>
        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              Pas encore d&apos;amis. Explore les ligues pour en trouver !
            </p>
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
                  className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800"
                >
                  <div className="h-8 w-8 rounded-full bg-zinc-800 text-center leading-8">
                    {friend.avatar_url || "👤"}
                  </div>
                  <span className="font-bold text-white">
                    {friend.username}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
