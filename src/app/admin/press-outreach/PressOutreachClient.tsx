"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, RotateCcw, Loader2 } from "lucide-react";

const TARGET_TYPES = [
  "Journaliste tech/jeux",
  "Journaliste foot",
  "Micro-influenceur Twitter foot",
  "Podcast foot/tech",
  "Blogger / newsletter",
  "Autre",
];

export function PressOutreachClient() {
  const [targetName, setTargetName] = useState("");
  const [targetType, setTargetType] = useState(TARGET_TYPES[0]);
  const [context, setContext] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!targetName.trim() || !context.trim()) {
      toast.error("Remplis le nom et le contexte avant de générer.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetName, targetType, context, language }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Erreur génération");
        return;
      }

      setResult(json.data.email);
      toast.success("Email généré !");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copié !");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="space-y-4 rounded-xl border border-white/8 bg-zinc-900 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
              Nom de la cible
            </label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="ex: Thomas Rozec"
              className="w-full rounded-lg border border-white/8 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-yellow-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
              Type de cible
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full rounded-lg border border-white/8 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-yellow-500/50 focus:outline-none"
            >
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
            Contexte — articles récents, ligne éditoriale, audience
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={5}
            placeholder={`ex: Journaliste chez Numerama, couvre les apps de sport et les nouvelles formes de jeu. Dernier article : "MPG, MPP : pourquoi les jeux de pronostics foot explosent en France" (mai 2026). Audience : fans de foot tech-savvy, 25-40 ans.`}
            className="w-full rounded-lg border border-white/8 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-yellow-500/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["fr", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  language === lang
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "border border-white/8 text-zinc-500 hover:text-white"
                }`}
              >
                {lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Génération…" : "Générer l'email"}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-green-500/20 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400">
              Email généré — relis avant d&apos;envoyer
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copié !" : "Copier"}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regénérer
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap px-5 py-4 font-mono text-sm leading-relaxed text-zinc-300">
            {result}
          </pre>
        </div>
      )}

      <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs font-semibold text-blue-400">
        💡 Coût : ~0,01€ par email généré (Claude Haiku). Envoie depuis ton
        Gmail perso, 5-10 par jour maximum.
      </p>
    </div>
  );
}
