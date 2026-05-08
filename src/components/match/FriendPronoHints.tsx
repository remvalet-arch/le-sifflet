"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

type Hint = {
  prono_type: string;
  prono_value: string;
  friend_count: number;
};

const PRONO_LABEL: Record<string, string> = {
  exact_score: "score exact",
  scorer: "buteur",
  scorer_allocation: "buts",
  "1": "victoire domicile",
  N: "match nul",
  "2": "victoire extérieur",
};

function friendLabel(count: number) {
  return count === 1 ? "1 ami a mis" : `${count} amis ont mis`;
}

function valueLabel(type: string, value: string) {
  if (type === "exact_score") return `score exact ${value}`;
  if (type === "scorer") return `buteur ${value}`;
  const known = PRONO_LABEL[value];
  return known ? known : value;
}

export function FriendPronoHints({
  matchId,
  userId,
}: {
  matchId: string;
  userId: string;
}) {
  const [hints, setHints] = useState<Hint[]>([]);

  useEffect(() => {
    void fetch(`/api/pronos/friend-hints?matchId=${matchId}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; data?: { hints: Hint[] } }) => {
        if (d.ok && d.data?.hints?.length) setHints(d.data.hints);
      })
      .catch(() => {
        /* silent */
      });
  }, [matchId, userId]);

  if (hints.length === 0) return null;

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
        <Users className="h-3 w-3" />
        Tes amis
      </p>
      <div className="flex flex-col gap-1">
        {hints.slice(0, 3).map((h, i) => (
          <p key={i} className="text-xs text-zinc-300">
            <span className="font-black text-amber-400">
              {friendLabel(h.friend_count)}
            </span>{" "}
            {valueLabel(h.prono_type, h.prono_value)}.
          </p>
        ))}
      </div>
    </div>
  );
}
