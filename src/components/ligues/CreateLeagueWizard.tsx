"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Target, Shuffle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "classic" | "braquage";

export function CreateLeagueWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("🏆");
  const [mode, setMode] = useState<Mode>("classic");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const LOGOS = ["🏆", "⚽", "🔥", "👑", "🍺", "🍕", "🤡", "💰"];

  async function handleCreate() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const invite_code = Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");

      const { data: squad, error: squadErr } = await supabase
        .from("squads")
        .insert({
          name: name.trim(),
          is_private: true,
          invite_code,
          owner_id: user.id,
          game_mode: mode,
        })
        .select()
        .single();

      if (squadErr || !squad)
        throw new Error(squadErr?.message || "Erreur de création");

      const { error: memberErr } = await supabase
        .from("squad_members")
        .insert({ squad_id: squad.id, user_id: user.id });

      if (memberErr) throw new Error(memberErr.message);

      toast.success("Ligue créée avec succès !");
      onCreated(squad.id, squad.name);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || "Erreur serveur");
      } else {
        toast.error("Erreur serveur");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 sm:items-center sm:justify-center sm:bg-black/80 sm:backdrop-blur-sm">
      <div className="flex h-full w-full flex-col sm:h-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-white/10 sm:bg-zinc-950 sm:shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-800">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center p-4">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="p-2 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="flex-1 text-center font-black uppercase tracking-widest text-zinc-500 text-[10px] mr-10">
            Étape {step} / 3
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col p-6 sm:px-8 sm:pb-8 justify-between">
          {step === 1 && (
            <div className="flex flex-col items-center flex-1 justify-center space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-white text-center">
                Trouve un nom qui claque.
              </h2>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && name.trim() && setStep(2)
                }
                placeholder="Les Galactiques..."
                maxLength={30}
                className="w-full text-center text-3xl font-black bg-transparent border-b-2 border-zinc-700 py-2 focus:outline-none focus:border-amber-500 text-amber-400 placeholder-zinc-700 transition"
              />
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full h-14 rounded-2xl bg-amber-500 font-black uppercase tracking-wide text-black disabled:opacity-40 transition active:scale-95"
              >
                Suivant
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col flex-1 space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">
                  L&apos;emblème du vestiaire
                </h2>
                <p className="text-sm text-zinc-400 mt-2">
                  Choisis un symbole pour ta ligue
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-zinc-800 border-2 border-amber-500 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-8 transition-transform">
                  {logo}
                </div>

                <div className="grid grid-cols-4 gap-3 w-full">
                  {LOGOS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLogo(l)}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition active:scale-95 ${logo === l ? "bg-amber-500/20 border-2 border-amber-500" : "bg-zinc-800/50 border border-white/5 hover:bg-zinc-800"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full h-14 rounded-2xl bg-amber-500 font-black uppercase tracking-wide text-black transition active:scale-95 mt-auto"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col flex-1 space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">
                  Le Mode de Jeu
                </h2>
              </div>

              <div className="flex-1 flex flex-col gap-4 justify-center">
                <button
                  onClick={() => setMode("classic")}
                  className={`flex items-start gap-4 p-5 rounded-3xl border-2 text-left transition active:scale-95 ${mode === "classic" ? "border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "border-zinc-800 bg-zinc-900"}`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${mode === "classic" ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black text-lg ${mode === "classic" ? "text-amber-400" : "text-white"}`}
                    >
                      Classique
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Pot commun & Classement général. L&apos;expérience VAR
                      TIME authentique.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setMode("braquage")}
                  className={`flex items-start gap-4 p-5 rounded-3xl border-2 text-left transition active:scale-95 ${mode === "braquage" ? "border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]" : "border-zinc-800 bg-zinc-900"}`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${mode === "braquage" ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    <Shuffle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black text-lg ${mode === "braquage" ? "text-purple-400" : "text-white"}`}
                    >
                      1vs1{" "}
                      <span className="ml-2 text-[9px] uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded-full border border-white/10 text-zinc-400">
                        Prochainement
                      </span>
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Saison en Championnat. Un adversaire par week-end.
                      Interdit pour le moment.
                    </p>
                  </div>
                </button>
              </div>

              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-white font-black uppercase tracking-wide text-black transition active:scale-95 disabled:opacity-50 mt-auto flex items-center justify-center gap-2"
              >
                {submitting ? (
                  "Création..."
                ) : (
                  <>
                    Créer ma ligue <Users className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
