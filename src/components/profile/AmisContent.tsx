"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Check,
  X,
  ChevronRight,
  Trophy,
  Search,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type SearchProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

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
  const dim = size === "sm" ? "size-8 text-sm" : "size-10 text-base";
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
      <Image
        src={avatarUrl}
        alt={username}
        width={40}
        height={40}
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
  const t = useTranslations("Profile");
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      void channel.unsubscribe();
    };
  }, [currentUserId, supabase]);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${val.trim()}%`)
        .neq("id", currentUserId)
        .limit(5);
      setSearchResults((data as SearchProfile[]) ?? []);
      setSearchLoading(false);
    }, 350);
  }

  async function handleAddFriend(targetId: string) {
    if (addingId) return;
    setAddingId(targetId);
    const existing = friends.find(
      (f) =>
        (f.sender_id === currentUserId && f.receiver_id === targetId) ||
        (f.sender_id === targetId && f.receiver_id === currentUserId),
    );
    if (existing) {
      toast.error(t("amisAlreadySent"));
      setAddingId(null);
      return;
    }
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: currentUserId,
      receiver_id: targetId,
      status: "pending",
    });
    setAddingId(null);
    if (error) {
      toast.error(t("amisError"));
    } else {
      toast.success(t("amisSent"));
      setSearchQuery("");
      setSearchResults([]);
    }
  }

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
    toast.success(action === "accepted" ? t("amisAccepted") : t("amisRefused"));
  }

  if (loading) {
    return (
      <div className="text-center text-sm text-zinc-500 py-10">
        {t("amisLoading")}
      </div>
    );
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter(
    (f) => f.status === "pending" && f.receiver_id === currentUserId,
  );

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2.5">
          <Search className="size-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            aria-label={t("amisSearchAriaLabel")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("amisSearchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
            style={{ fontSize: "16px" }}
          />
        </div>
        {(searchResults.length > 0 || searchLoading) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
            {searchLoading ? (
              <p className="px-4 py-3 text-xs text-zinc-500">
                {t("amisSearching")}
              </p>
            ) : (
              searchResults.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0"
                >
                  <AvatarCircle
                    avatarUrl={p.avatar_url}
                    username={p.username}
                    size="sm"
                  />
                  <span className="flex-1 text-sm font-bold text-white">
                    {p.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleAddFriend(p.id)}
                    disabled={addingId === p.id}
                    className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-3 py-1 text-[11px] font-black text-green-400 transition hover:bg-green-500/25 disabled:opacity-50"
                  >
                    <UserPlus className="size-3" />
                    {t("amisAdd")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Link
        href="/ligues"
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3.5 transition hover:bg-emerald-500/12"
      >
        <Trophy className="size-5 shrink-0 text-emerald-400" />
        <div className="flex-1">
          <p className="text-sm font-black text-white">
            {t("amisFindFriendsTitle")}
          </p>
          <p className="text-[11px] text-zinc-500">
            {t("amisFindFriendsDesc")}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-zinc-500" />
      </Link>

      {pendingReceived.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {t("amisRequestsReceived")}
            </h3>
            <span className="flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">
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
                    className="flex size-9 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20 text-green-400 transition hover:bg-green-500/30"
                    aria-label={t("amisAcceptAriaLabel")}
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "rejected")}
                    className="flex size-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
                    aria-label={t("amisRefuseAriaLabel")}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {t("amisFriendsCount", { count: accepted.length })}
        </h3>
        {accepted.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-10 text-center">
            <Users className="size-10 text-zinc-600" />
            <div>
              <p className="text-sm font-bold text-zinc-400">
                {t("amisNoFriendsTitle")}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {t("amisNoFriendsDesc")}
              </p>
            </div>
            <Link
              href="/ligues"
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-800 px-4 py-2 text-xs font-black text-white transition hover:bg-zinc-700"
            >
              <Trophy className="size-3.5" />
              {t("amisExploreLigues")}
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
                  <ChevronRight className="size-4 text-zinc-600" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
