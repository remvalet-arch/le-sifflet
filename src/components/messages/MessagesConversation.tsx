"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Check, CheckCheck, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type {
  DirectMessageRow,
  DirectMessageThreadRow,
  MessageReactionRow,
} from "@/types/database";
import { track } from "@/lib/analytics";

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 2000;
const TYPING_DEBOUNCE_MS = 1500;
const TYPING_TTL_MS = 2500;
const PAGE_SIZE = 30;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "👎"] as const;

type ReactionMap = Map<
  string,
  { emoji: string; count: number; myReaction: boolean }[]
>;

export function MessagesConversation({
  threadId,
  currentUserId,
  otherId,
  otherUsername,
  otherAvatarUrl,
  otherReadAt,
  initialMessages,
}: {
  threadId: string;
  currentUserId: string;
  otherId: string;
  otherUsername: string;
  otherAvatarUrl?: string | null;
  otherReadAt: string | null;
  initialMessages: DirectMessageRow[];
}) {
  const t = useTranslations("Messages");
  const [messages, setMessages] = useState<DirectMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [liveOtherReadAt, setLiveOtherReadAt] = useState(otherReadAt);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reactions, setReactions] = useState<ReactionMap>(new Map());
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<{
    send: (msg: object) => Promise<"ok" | "error" | "timed out">;
  } | null>(null);
  const isSubscribedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update presence on mount
  useEffect(() => {
    void fetch("/api/profile/presence", { method: "POST" });
  }, []);

  // Mark thread as read on mount
  useEffect(() => {
    const supabase = createClient();
    void supabase.rpc("mark_dm_thread_read", { p_thread_id: threadId });
  }, [threadId]);

  // Load reactions for visible messages
  useEffect(() => {
    if (messages.length === 0) return;
    const supabase = createClient();
    const ids = messages.map((m) => m.id);
    void supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", ids)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<
          string,
          { emoji: string; count: number; myReaction: boolean }[]
        >();
        for (const r of data) {
          const existing = map.get(r.message_id) ?? [];
          const bucket = existing.find((b) => b.emoji === r.emoji);
          if (bucket) {
            bucket.count++;
            if (r.user_id === currentUserId) bucket.myReaction = true;
          } else {
            existing.push({
              emoji: r.emoji,
              count: 1,
              myReaction: r.user_id === currentUserId,
            });
          }
          map.set(r.message_id, existing);
        }
        setReactions(map);
      });
  }, [messages, currentUserId]);

  // Realtime — messages + thread read_at + typing + reactions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          const readNow = new Date().toISOString();
          if (currentUserId < otherId) {
            void supabase
              .from("direct_message_threads")
              .update({ user_a_read_at: readNow })
              .eq("id", threadId);
          } else {
            void supabase
              .from("direct_message_threads")
              .update({ user_b_read_at: readNow })
              .eq("id", threadId);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_message_threads",
          filter: `id=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as DirectMessageThreadRow;
          const newOtherReadAt =
            updated.user_a_id === otherId
              ? updated.user_a_read_at
              : updated.user_b_read_at;
          if (newOtherReadAt) {
            setTimeout(() => setLiveOtherReadAt(newOtherReadAt), 0);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const r = (payload.new ?? payload.old) as MessageReactionRow;
          if (!r?.message_id) return;
          setReactions((prev) => {
            const map = new Map(prev);
            void supabase
              .from("message_reactions")
              .select("*")
              .eq("message_id", r.message_id)
              .then(({ data }) => {
                const buckets: {
                  emoji: string;
                  count: number;
                  myReaction: boolean;
                }[] = [];
                for (const row of data ?? []) {
                  const b = buckets.find((x) => x.emoji === row.emoji);
                  if (b) {
                    b.count++;
                    if (row.user_id === currentUserId) b.myReaction = true;
                  } else {
                    buckets.push({
                      emoji: row.emoji,
                      count: 1,
                      myReaction: row.user_id === currentUserId,
                    });
                  }
                }
                setReactions((m) => {
                  const next = new Map(m);
                  next.set(r.message_id, buckets);
                  return next;
                });
              });
            return map;
          });
        },
      )
      .on(
        "broadcast",
        { event: "typing" },
        (payload: { payload?: { user_id?: string } }) => {
          if (payload.payload?.user_id === otherId) {
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            setTimeout(() => setIsOtherTyping(true), 0);
            typingTimeoutRef.current = setTimeout(
              () => setIsOtherTyping(false),
              TYPING_TTL_MS,
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") isSubscribedRef.current = true;
      });

    channelRef.current = channel as unknown as {
      send: (msg: object) => Promise<"ok" | "error" | "timed out">;
    };

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isSubscribedRef.current = false;
      channelRef.current = null;
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close reaction picker on outside tap
  useEffect(() => {
    if (!pickerMsgId) return;
    function handleClick() {
      setTimeout(() => setPickerMsgId(null), 0);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pickerMsgId]);

  async function loadMore() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0]!.sent_at;
    const supabase = createClient();
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("thread_id", threadId)
      .lt("sent_at", oldest)
      .order("sent_at", { ascending: false })
      .limit(PAGE_SIZE);
    setLoadingMore(false);
    const older = (data ?? []).slice().reverse();
    if (older.length < PAGE_SIZE) setTimeout(() => setHasMore(false), 0);
    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const now = Date.now();
    if (now - lastSentAt < RATE_LIMIT_MS) {
      toast.error("Doucement, laisse souffler l'autre !");
      return;
    }

    setSending(true);
    setLastSentAt(now);
    setText("");

    try {
      const res = await fetch(`/api/messages/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Message non envoyé");
        setText(trimmed);
      } else {
        track("dm_sent", { is_first_message_in_thread: false });
      }
    } catch {
      toast.error("Connexion perdue, réessaie.");
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, lastSentAt, otherId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleTextChange(val: string) {
    setText(val.slice(0, MAX_CHARS));
    const now = Date.now();
    if (
      channelRef.current &&
      isSubscribedRef.current &&
      now - lastTypingBroadcastRef.current > TYPING_DEBOUNCE_MS
    ) {
      lastTypingBroadcastRef.current = now;
      void channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: currentUserId },
      });
    }
  }

  function handleLongPressStart(msgId: string) {
    longPressTimerRef.current = setTimeout(() => {
      setPickerMsgId(msgId);
    }, 500);
  }

  function handleLongPressEnd() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }

  async function toggleReaction(msgId: string, emoji: string) {
    setPickerMsgId(null);
    await fetch("/api/messages/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msgId, emoji }),
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {/* Load more */}
        {hasMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="mx-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <ChevronUp className="size-3" />
            {loadingMore ? "Chargement…" : "Voir plus"}
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl" aria-hidden="true">
              👋
            </span>
            <p className="text-sm font-black text-zinc-400">
              Démarre la conversation !
            </p>
            <p className="text-xs text-zinc-600">
              {otherUsername} attend ton premier message.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const isFirst = !prev || prev.sender_id !== msg.sender_id;
          const isLast = !next || next.sender_id !== msg.sender_id;
          const time = new Date(msg.sent_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isLastMine =
            isMe &&
            !messages.slice(i + 1).some((m) => m.sender_id === currentUserId);
          const isRead =
            liveOtherReadAt !== null && msg.sent_at <= liveOtherReadAt;
          const msgReactions = reactions.get(msg.id) ?? [];
          const isPickerOpen = pickerMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirst && i > 0 ? "mt-2" : "mt-0.5"}`}
            >
              <div
                className={`relative flex items-end gap-1.5 max-w-[78%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <div className="mb-0.5 shrink-0">
                    {isLast ? (
                      <div className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-[9px] font-black text-zinc-300">
                        {otherAvatarUrl ? (
                          <Image
                            src={otherAvatarUrl}
                            alt={otherUsername}
                            width={24}
                            height={24}
                            className="size-6 object-cover"
                          />
                        ) : (
                          (otherUsername[0] ?? "?").toUpperCase()
                        )}
                      </div>
                    ) : (
                      <div className="size-6" />
                    )}
                  </div>
                )}

                {/* Message bubble with long-press for reactions */}
                <div
                  onTouchStart={() => handleLongPressStart(msg.id)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPickerMsgId(msg.id);
                  }}
                >
                  {msg.content_type === "image" && msg.media_url ? (
                    <div
                      className={`overflow-hidden rounded-2xl ${isFirst ? "" : ""} ${isLast ? "" : ""}`}
                    >
                      <Image
                        src={msg.media_url}
                        alt="Image"
                        width={240}
                        height={180}
                        className="max-w-[240px] rounded-2xl object-cover"
                        unoptimized
                      />
                    </div>
                  ) : msg.content_type === "gif" && msg.media_url ? (
                    <img
                      src={msg.media_url}
                      alt="GIF"
                      className="max-w-[240px] rounded-2xl"
                    />
                  ) : (
                    <div
                      className={`px-3.5 py-2 text-sm leading-snug ${
                        isMe
                          ? `bg-whistle/20 text-white ${isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${isLast ? "rounded-bl-2xl rounded-br-sm" : "rounded-b-lg"}`
                          : `bg-zinc-800 text-zinc-100 ${isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${isLast ? "rounded-br-2xl rounded-bl-sm" : "rounded-b-lg"}`
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}

                  {/* Reaction picker */}
                  {isPickerOpen && (
                    <div
                      className={`absolute bottom-full mb-1 z-20 flex gap-1 rounded-2xl border border-white/10 bg-zinc-900 p-1.5 shadow-xl ${isMe ? "right-0" : "left-0"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {REACTION_EMOJIS.map((em) => {
                        const myR = msgReactions.find(
                          (r) => r.emoji === em && r.myReaction,
                        );
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={() => void toggleReaction(msg.id, em)}
                            className={`flex size-8 items-center justify-center rounded-xl text-lg transition active:scale-90 ${myR ? "bg-whistle/20" : "hover:bg-white/5"}`}
                            aria-label={`Réagir avec ${em}`}
                          >
                            {em}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Reactions display */}
              {msgReactions.length > 0 && (
                <div
                  className={`mt-0.5 flex flex-wrap gap-1 ${isMe ? "justify-end" : "justify-start"} ${isMe ? "" : "ml-8"}`}
                >
                  {msgReactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => void toggleReaction(msg.id, r.emoji)}
                      className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] transition active:scale-95 ${
                        r.myReaction
                          ? "border border-whistle/50 bg-whistle/15 text-whistle"
                          : "border border-white/10 bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-bold tabular-nums">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {isLast && (
                <div
                  className={`mt-0.5 flex items-center gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span
                    className="text-[9px] text-zinc-600"
                    suppressHydrationWarning
                  >
                    {time}
                  </span>
                  {isMe &&
                    isLastMine &&
                    (isRead ? (
                      <CheckCheck
                        className="size-3 text-whistle"
                        aria-label={t("ariaRead")}
                      />
                    ) : (
                      <Check
                        className="size-3 text-zinc-500"
                        aria-label={t("ariaSent")}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="mt-1 flex items-end gap-1.5">
            <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-[9px] font-black text-zinc-300">
              {otherAvatarUrl ? (
                <Image
                  src={otherAvatarUrl}
                  alt={otherUsername}
                  width={24}
                  height={24}
                  className="size-6 object-cover"
                />
              ) : (
                (otherUsername[0] ?? "?").toUpperCase()
              )}
            </div>
            <div
              className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-800 px-3.5 py-2"
              aria-live="polite"
              aria-label={t("typing", { name: otherUsername })}
            >
              <span
                className="animate-bounce text-zinc-400"
                style={{ animationDelay: "0ms" }}
              >
                •
              </span>
              <span
                className="animate-bounce text-zinc-400"
                style={{ animationDelay: "150ms" }}
              >
                •
              </span>
              <span
                className="animate-bounce text-zinc-400"
                style={{ animationDelay: "300ms" }}
              >
                •
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 border-t border-white/8 px-3 pt-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <input
          type="text"
          aria-label="Écrire un message"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris un message…"
          className="min-h-[36px] flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        <span
          className={`text-[9px] font-bold ${text.length > MAX_CHARS - 50 ? "text-orange-400" : "text-zinc-700"}`}
          aria-hidden="true"
        >
          {text.length}/{MAX_CHARS}
        </span>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-whistle/20 text-whistle transition hover:bg-whistle/30 disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
