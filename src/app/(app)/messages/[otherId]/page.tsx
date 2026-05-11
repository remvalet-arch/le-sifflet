import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessagesConversation } from "@/components/messages/MessagesConversation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("conversation") };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ otherId: string }>;
}) {
  const { otherId } = await params;
  const t = await getTranslations("Messages");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (otherId === user.id) notFound();

  const admin = createAdminClient();

  // Infos de l'autre utilisateur
  const { data: other } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", otherId)
    .maybeSingle();

  if (!other) notFound();

  // Vérification amitié
  const { data: friendship } = await admin
    .from("friend_requests")
    .select("id")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`,
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (!friendship) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <p className="text-zinc-400 text-sm">{t("notFriends")}</p>
      </main>
    );
  }

  // Trouver ou créer le thread
  const [userA, userB] = [user.id, otherId].sort();
  const { data: existingThread } = await supabase
    .from("direct_message_threads")
    .select("*")
    .eq("user_a_id", userA)
    .eq("user_b_id", userB)
    .maybeSingle();

  let threadId: string;
  let otherReadAt: string | null = null;

  if (!existingThread) {
    const { data: newThread } = await admin
      .from("direct_message_threads")
      .insert({ user_a_id: userA, user_b_id: userB })
      .select("id")
      .single();
    if (!newThread) notFound();
    threadId = newThread.id;
  } else {
    threadId = existingThread.id;

    // The other user's read_at tells the current user if their messages have been read
    otherReadAt =
      existingThread.user_a_id === otherId
        ? existingThread.user_a_read_at
        : existingThread.user_b_read_at;

    // Mark thread as read for current user
    const readNow = new Date().toISOString();
    if (existingThread.user_a_id === user.id) {
      await admin
        .from("direct_message_threads")
        .update({ user_a_read_at: readNow })
        .eq("id", threadId);
    } else {
      await admin
        .from("direct_message_threads")
        .update({ user_b_read_at: readNow })
        .eq("id", threadId);
    }
  }

  // Chargement initial des messages (50 derniers)
  const { data: messages } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true })
    .limit(50);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* Header conversation */}
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <Link
          href="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-black text-zinc-300">
          {other.avatar_url ? (
            <Image
              src={other.avatar_url}
              alt={other.username}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            other.username[0]?.toUpperCase()
          )}
        </div>
        <Link href={`/profile/${otherId}`} className="min-w-0">
          <p className="font-black text-white">{other.username}</p>
          <p className="text-[10px] text-zinc-600">{t("friendStatus")}</p>
        </Link>
      </div>

      <MessagesConversation
        threadId={threadId}
        currentUserId={user.id}
        otherId={otherId}
        otherUsername={other.username}
        otherAvatarUrl={other.avatar_url}
        otherReadAt={otherReadAt}
        initialMessages={messages ?? []}
      />
    </main>
  );
}
