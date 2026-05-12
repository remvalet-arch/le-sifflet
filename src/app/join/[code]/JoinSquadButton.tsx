"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

export default function JoinSquadButton({
  inviteCode,
  squadId,
  squadName,
}: {
  inviteCode: string;
  squadId: string;
  squadName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    setLoading(true);
    try {
      const res = await fetch("/api/squads/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? "Impossible de rejoindre la ligue.");
        return;
      }
      toast.success(`Bienvenue dans ${squadName} ! 🎉`);
      router.push(`/ligues/${squadId}`);
    } catch {
      toast.error("Connexion perdue. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={loading}
      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 font-black text-zinc-900 transition hover:bg-yellow-300 disabled:opacity-60 active:scale-95"
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-spin" />
      ) : (
        "Rejoindre le vestiaire ⚽"
      )}
    </button>
  );
}
