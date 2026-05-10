export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
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
      <h1 className="mb-4 text-xl font-black text-white">{t("title")}</h1>

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
