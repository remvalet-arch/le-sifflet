export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("messages") };
}

export default async function MessagesPage() {
  const t = await getTranslations("Messages");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: threads } = await supabase
    .from("direct_message_threads")
    .select("*")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const otherIds = (threads ?? []).map((t) =>
    t.user_a_id === user.id ? t.user_b_id : t.user_a_id,
  );

  let profiles: { id: string; username: string; avatar_url: string | null }[] =
    [];
  if (otherIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", otherIds);
    profiles = data ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Fetch accepted friends not already in a thread
  const threadPartnerIds = new Set(otherIds);
  const { data: friendRequests } = await supabase
    .from("friend_requests")
    .select("sender_id, receiver_id")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendIds = (friendRequests ?? [])
    .map((fr) => (fr.sender_id === user.id ? fr.receiver_id : fr.sender_id))
    .filter((id) => !threadPartnerIds.has(id));

  let friendsWithoutThread: { id: string; username: string }[] = [];
  if (friendIds.length > 0) {
    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", friendIds)
      .limit(10);
    friendsWithoutThread = friendProfiles ?? [];
  }

  const enriched = (threads ?? []).map((t) => {
    const otherId = t.user_a_id === user.id ? t.user_b_id : t.user_a_id;
    const myReadAt =
      t.user_a_id === user.id ? t.user_a_read_at : t.user_b_read_at;
    const hasUnread =
      t.last_message_at !== null &&
      (myReadAt === null || t.last_message_at > myReadAt);
    return { thread: t, otherId, other: profileMap.get(otherId), hasUnread };
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-wide text-white">
          {t("title")}
        </h1>
        {friendsWithoutThread.length > 0 && (
          <details className="relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white active:scale-95">
              <Plus className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-10 z-10 min-w-[180px] rounded-2xl border border-white/10 bg-zinc-900 py-1 shadow-xl">
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {t("newConversationLabel")}
              </p>
              {friendsWithoutThread.map((f) => (
                <Link
                  key={f.id}
                  href={`/messages/${f.id}`}
                  className="block px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  {f.username}
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <MessageCircle className="h-10 w-10 text-zinc-600" />
          <p className="text-sm font-black text-zinc-400">{t("noMessages")}</p>
          <p className="max-w-[200px] text-xs text-zinc-600">
            {t("noMessagesDesc")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {enriched.map(({ thread, otherId, other, hasUnread }) => (
            <li key={thread.id}>
              <Link
                href={`/messages/${otherId}`}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-base font-black text-zinc-300">
                  {other?.avatar_url ? (
                    <Image
                      src={other.avatar_url}
                      alt={other.username}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    (other?.username?.[0] ?? "?").toUpperCase()
                  )}
                  {hasUnread && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-whistle ring-2 ring-zinc-950" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold ${hasUnread ? "text-white" : "text-zinc-300"}`}
                  >
                    {other?.username ?? t("unknownPlayer")}
                  </p>
                  {thread.last_message_preview ? (
                    <p
                      className={`truncate text-xs ${hasUnread ? "font-semibold text-zinc-400" : "text-zinc-600"}`}
                    >
                      {thread.last_message_preview}
                    </p>
                  ) : (
                    <p className="text-xs italic text-zinc-700">
                      {t("newConversation")}
                    </p>
                  )}
                </div>
                {thread.last_message_at && (
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(thread.last_message_at), {
                      locale: fr,
                      addSuffix: false,
                    })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
