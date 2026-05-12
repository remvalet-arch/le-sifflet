export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { MessagesListClient } from "@/components/messages/MessagesListClient";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("messages") };
}

export default async function MessagesPage() {
  const t = await getTranslations("Messages");
  void t; // used by MessagesListClient via next-intl
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

  // Friends not yet in a thread
  const threadPartnerIds = new Set(otherIds);
  const { data: friendRequests } = await supabase
    .from("friend_requests")
    .select("sender_id, receiver_id")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendIds = (friendRequests ?? []).reduce<string[]>((acc, fr) => {
    const id = fr.sender_id === user.id ? fr.receiver_id : fr.sender_id;
    if (!threadPartnerIds.has(id)) acc.push(id);
    return acc;
  }, []);

  let friendsWithoutThread: { id: string; username: string }[] = [];
  if (friendIds.length > 0) {
    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", friendIds)
      .limit(10);
    friendsWithoutThread = friendProfiles ?? [];
  }

  const enriched = (threads ?? []).map((thread) => {
    const otherId =
      thread.user_a_id === user.id ? thread.user_b_id : thread.user_a_id;
    const myReadAt =
      thread.user_a_id === user.id
        ? thread.user_a_read_at
        : thread.user_b_read_at;
    const hasUnread =
      thread.last_message_at !== null &&
      (myReadAt === null || thread.last_message_at > myReadAt);
    return { thread, otherId, other: profileMap.get(otherId), hasUnread };
  });

  return (
    <MessagesListClient
      enriched={enriched}
      friendsWithoutThread={friendsWithoutThread}
    />
  );
}
