"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { USERNAME_RE, generateUsernameSuggestions } from "@/lib/username";

const LS_KEY = "username_setup_dismissed";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

type Props = {
  currentUsername: string;
  userEmail: string;
  onDismiss: () => void;
};

export function UsernameSetupModal({
  currentUsername,
  userEmail,
  onDismiss,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [checkMessage, setCheckMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggestions] = useState(() => generateUsernameSuggestions(userEmail));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (u: string) => {
    if (!u || !USERNAME_RE.test(u)) {
      setCheckState(u ? "invalid" : "idle");
      setCheckMessage(u ? "3-20 caractères : lettres, chiffres, _ ou -" : "");
      return;
    }
    setCheckState("checking");
    setCheckMessage("");
    try {
      const res = await fetch("/api/users/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { available: boolean; valid: boolean; message?: string };
      };
      if (!json.ok || !json.data) {
        setCheckState("invalid");
        return;
      }
      if (!json.data.valid) {
        setCheckState("invalid");
        setCheckMessage(json.data.message ?? "Pseudo invalide");
      } else if (!json.data.available) {
        setCheckState("taken");
        setCheckMessage("Déjà pris");
      } else {
        setCheckState("available");
        setCheckMessage("Disponible !");
      }
    } catch {
      setCheckState("idle");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void checkUsername(value);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, checkUsername]);

  async function handleSave() {
    if (checkState !== "available" || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? "Erreur lors de la sauvegarde");
        setSaving(false);
        return;
      }
      toast.success(`Pseudo "${value}" enregistré ! 🎉`);
      onDismiss();
      router.refresh();
    } catch {
      toast.error("Connexion perdue, réessaie.");
      setSaving(false);
    }
  }

  function handleSkip() {
    localStorage.setItem(LS_KEY, "true");
    onDismiss();
  }

  const inputCls = {
    idle: "border-white/10",
    checking: "border-zinc-500",
    available: "border-green-500",
    taken: "border-red-500",
    invalid: "border-amber-500",
  }[checkState];

  const statusIcon = {
    checking: <Loader2 className="size-4 animate-spin text-zinc-400" />,
    available: <Check className="size-4 text-green-400" />,
    taken: <X className="size-4 text-red-400" />,
    invalid: <X className="size-4 text-amber-400" />,
    idle: null,
  }[checkState];

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
        onClick={handleSkip}
      />
      <div className="relative z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 rounded-t-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-whistle/10">
            <Sparkles className="size-6 text-whistle" />
          </div>
          <button
            onClick={handleSkip}
            className="p-1 text-zinc-500 transition hover:text-white"
            aria-label="Passer"
          >
            <X className="size-5" />
          </button>
        </div>

        <h2 className="mb-1 text-xl font-semibold text-white">
          Choisis ton pseudo
        </h2>
        <p className="mb-5 text-sm text-zinc-400">
          Ton pseudo actuel{" "}
          <span className="font-mono text-zinc-300">{currentUsername}</span> a
          été généré automatiquement. Personnalise-le !
        </p>

        {/* Input */}
        <div className="relative mb-1">
          <input
            type="text"
            aria-label="Ton pseudo"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 20))}
            placeholder="MonPseudo"
            autoFocus
            maxLength={20}
            className={`w-full rounded-2xl border bg-zinc-800 px-4 py-3 pr-10 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:ring-1 focus:ring-white/20 ${inputCls}`}
          />
          {statusIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {statusIcon}
            </span>
          )}
        </div>
        <p
          className={`mb-4 min-h-[16px] text-xs ${
            checkState === "available"
              ? "text-green-400"
              : checkState === "taken" || checkState === "invalid"
                ? "text-amber-400"
                : "text-zinc-600"
          }`}
        >
          {checkMessage || "3-20 caractères : lettres, chiffres, _ ou -"}
        </p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValue(s)}
                className="rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:border-white/30 hover:text-white active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-400 transition hover:text-white active:scale-95"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={checkState !== "available" || saving}
            className="flex-1 rounded-2xl bg-whistle py-3 text-sm font-black text-pitch-900 transition disabled:opacity-40 active:scale-95"
          >
            {saving ? "Enregistrement…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
