"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { SquadMessageRow } from "@/types/database";

type MessageWithProfile = SquadMessageRow & {
  profiles: { username: string; avatar_url: string | null } | null;
};

const RATE_LIMIT_MS = 3000;
const MAX_CHARS = 200;

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

export function SquadChat({
  squadId,
  currentUserId,
}: {
  squadId: string;
  currentUserId: string;
}) {
  const t = useTranslations("Ligues");
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  // Marquer comme lu à chaque visite
  useEffect(() => {
    void supabase
      .from("squad_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("squad_id", squadId)
      .eq("user_id", currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId, currentUserId]);

  useEffect(() => {
    // Initial fetch
    void (async () => {
      const { data: rawMsgs } = await supabase
        .from("squad_messages")
        .select("*")
        .eq("squad_id", squadId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (!rawMsgs || rawMsgs.length === 0) return;

      const userIds = [
        ...new Set(
          rawMsgs
            .map((m) => m.user_id)
            .filter((id): id is string => id !== null),
        ),
      ];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(
        (profilesData ?? []).map((p) => [
          p.id,
          { username: p.username, avatar_url: p.avatar_url },
        ]),
      );
      setMessages(
        rawMsgs.map((m) => ({
          ...m,
          profiles: m.user_id ? (profileMap.get(m.user_id) ?? null) : null,
        })),
      );
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`squad-chat-${squadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_messages",
          filter: `squad_id=eq.${squadId}`,
        },
        async (payload) => {
          const newMsg = payload.new as SquadMessageRow;
          if (newMsg.is_system_message || !newMsg.user_id) {
            setMessages((prev) => [...prev, { ...newMsg, profiles: null }]);
            return;
          }
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newMsg.user_id)
            .single();
          const enriched: MessageWithProfile = {
            ...newMsg,
            profiles: profileData ?? null,
          };
          setMessages((prev) => [...prev, enriched]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const now = Date.now();
    if (now - lastSentAt < RATE_LIMIT_MS) {
      toast.error(t("chatRateLimitError"));
      return;
    }

    setSending(true);
    setLastSentAt(now);

    try {
      const res = await fetch(`/api/squads/${squadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        toast.error(t("chatSendError"));
      } else {
        setText("");
      }
    } catch {
      toast.error(t("chatConnError"));
    } finally {
      setSending(false);
    }
  }, [text, sending, lastSentAt, squadId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {t("chatTitle")}
        </p>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2 px-4 py-3 overflow-y-auto max-h-64 min-h-[80px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="text-3xl">💬</span>
            <p className="text-sm font-black text-zinc-400">{t("chatEmpty")}</p>
            <p className="text-xs text-zinc-600 max-w-[180px]">
              {t("chatEmptyDesc")}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.is_system_message) {
              return (
                <div key={msg.id} className="flex items-center gap-2 py-0.5">
                  <div className="h-px flex-1 bg-white/5" />
                  <p className="max-w-[85%] rounded-lg border border-green-800/30 bg-green-950/30 px-2.5 py-1.5 text-center text-[11px] italic text-green-400/80">
                    <span className="not-italic mr-1.5 rounded border border-green-700/30 bg-green-900/30 px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-green-500/70">
                      VAR TIME
                    </span>
                    {renderBold(msg.content)}
                  </p>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              );
            }
            const isMe = msg.user_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-black text-zinc-400 mt-0.5">
                  {msg.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div
                  className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
                >
                  {!isMe && (
                    <span className="text-[9px] font-bold text-zinc-500 px-1">
                      {msg.profiles?.username}
                    </span>
                  )}
                  <div
                    className={`rounded-xl px-3 py-1.5 text-xs ${
                      isMe
                        ? "bg-whistle/20 text-white"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2">
        <input
          type="text"
          aria-label={t("chatInputAriaLabel")}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder={t("chatPlaceholder")}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none min-h-[36px]"
        />
        <span
          className={`text-[9px] font-bold ${text.length > MAX_CHARS - 20 ? "text-orange-400" : "text-zinc-700"}`}
        >
          {text.length}/{MAX_CHARS}
        </span>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-whistle/20 text-whistle transition hover:bg-whistle/30 disabled:opacity-40"
          aria-label={t("chatSendAriaLabel")}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
