"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DirectMessageThreadRow } from "@/types/database";

type OtherProfile =
  | { id: string; username: string; avatar_url: string | null }
  | undefined;

type EnrichedThread = {
  thread: DirectMessageThreadRow;
  otherId: string;
  other: OtherProfile;
  hasUnread: boolean;
};

type Props = {
  enriched: EnrichedThread[];
  friendsWithoutThread: { id: string; username: string }[];
};

export function MessagesListClient({ enriched, friendsWithoutThread }: Props) {
  const t = useTranslations("Messages");
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? enriched.filter((e) =>
        e.other?.username.toLowerCase().includes(query.toLowerCase()),
      )
    : enriched;

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

      {/* Search */}
      {enriched.length > 1 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5">
          <Search
            className="h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-zinc-500 transition hover:text-zinc-300"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <MessageCircle
            className="h-10 w-10 text-zinc-600"
            aria-hidden="true"
          />
          <p className="text-sm font-black text-zinc-400">
            {query ? t("noResults") : t("noMessages")}
          </p>
          {!query && (
            <p className="max-w-[200px] text-xs text-zinc-600">
              {t("noMessagesDesc")}
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map(({ thread, otherId, other, hasUnread }) => (
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
