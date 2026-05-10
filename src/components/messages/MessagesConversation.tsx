"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessageRow } from "@/types/database";
import { track } from "@/lib/analytics";

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 2000;

export function MessagesConversation({
  threadId,
  currentUserId,
  otherId,
  otherUsername,
  otherAvatarUrl,
  initialMessages,
}: {
  threadId: string;
  currentUserId: string;
  otherId: string;
  otherUsername: string;
  otherAvatarUrl?: string | null;
  initialMessages: DirectMessageRow[];
}) {
  const [messages, setMessages] = useState<DirectMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Realtime subscription
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
            // Éviter les doublons (message optimiste déjà ajouté)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Marque comme lu côté client
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        setText(trimmed); // Restaure le texte
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">👋</span>
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
          const isLastOverall = i === messages.length - 1;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirst && i > 0 ? "mt-2" : "mt-0.5"}`}
            >
              <div
                className={`flex items-end gap-1.5 max-w-[78%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <div className="mb-0.5 shrink-0">
                    {isLast ? (
                      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-[9px] font-black text-zinc-300">
                        {otherAvatarUrl ? (
                          <Image
                            src={otherAvatarUrl}
                            alt={otherUsername}
                            width={24}
                            height={24}
                            className="h-6 w-6 object-cover"
                          />
                        ) : (
                          (otherUsername[0] ?? "?").toUpperCase()
                        )}
                      </div>
                    ) : (
                      <div className="h-6 w-6" />
                    )}
                  </div>
                )}
                <div
                  className={`px-3.5 py-2 text-sm leading-snug ${
                    isMe
                      ? `bg-whistle/20 text-white ${isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${isLast ? "rounded-bl-2xl rounded-br-sm" : "rounded-b-lg"}`
                      : `bg-zinc-800 text-zinc-100 ${isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${isLast ? "rounded-br-2xl rounded-bl-sm" : "rounded-b-lg"}`
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {isLast && (
                <div
                  className={`mt-0.5 flex items-center gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span className="text-[9px] text-zinc-600">{time}</span>
                  {isMe && isLastOverall && (
                    <CheckCheck className="h-3 w-3 text-whistle/60" />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2">
        <input
          type="text"
          aria-label="Écrire un message"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="Écris un message…"
          className="min-h-[36px] flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        <span
          className={`text-[9px] font-bold ${text.length > MAX_CHARS - 50 ? "text-orange-400" : "text-zinc-700"}`}
        >
          {text.length}/{MAX_CHARS}
        </span>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-whistle/20 text-whistle transition hover:bg-whistle/30 disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
