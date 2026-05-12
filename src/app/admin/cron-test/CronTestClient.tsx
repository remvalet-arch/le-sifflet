"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

const CRONS = [
  {
    id: "j1-inactive",
    label: "J+1 inactif",
    description: "Push aux users sans prono après 24h",
    emoji: "👋",
    emailTemplate: null,
  },
  {
    id: "j3-inactive",
    label: "J+3 inactif",
    description: "Email « ligue CDM réservée » aux inactifs",
    emoji: "📧",
    emailTemplate: "j3-inactive" as const,
  },
  {
    id: "j7-churn",
    label: "J+7 churn",
    description: "Email Tally feedback aux users qui ont décroché",
    emoji: "🙏",
    emailTemplate: "j7-churn" as const,
  },
  {
    id: "daily-digest",
    label: "Daily Digest",
    description: "Push + email bilan du jour aux users actifs hier",
    emoji: "📊",
    emailTemplate: "daily-digest" as const,
  },
  {
    id: "weekly-recap",
    label: "Weekly Recap",
    description: "Email récap 7 jours (normalement le dimanche)",
    emoji: "📅",
    emailTemplate: "weekly-recap" as const,
  },
  {
    id: "solo-activation",
    label: "Solo Activation",
    description: "Push + email aux users actifs sans ligue à J+3",
    emoji: "🏟️",
    emailTemplate: "squad-activation" as const,
  },
  {
    id: "twitter-live",
    label: "Twitter Live",
    description: "Tweete les events VAR des matchs en cours",
    emoji: "🐦",
    emailTemplate: null,
  },
  {
    id: "community-listener",
    label: "Community Listener",
    description: "Veille Twitter + email briefing mentions",
    emoji: "📡",
    emailTemplate: null,
  },
  {
    id: "personal-branding",
    label: "Personal Branding",
    description: "3 propositions de tweets founder par email",
    emoji: "✍️",
    emailTemplate: null,
  },
] as const;

type CronId = (typeof CRONS)[number]["id"];
type TemplateId =
  | "j3-inactive"
  | "j7-churn"
  | "daily-digest"
  | "weekly-recap"
  | "welcome"
  | "squad-activation";
type Status = "idle" | "loading" | "ok" | "error";

export function CronTestClient() {
  const [cronStatuses, setCronStatuses] = useState<Record<CronId, Status>>(
    () =>
      Object.fromEntries(CRONS.map((c) => [c.id, "idle"])) as Record<
        CronId,
        Status
      >,
  );
  const [cronResults, setCronResults] = useState<Record<CronId, string | null>>(
    () =>
      Object.fromEntries(CRONS.map((c) => [c.id, null])) as Record<
        CronId,
        string | null
      >,
  );
  const [emailStatuses, setEmailStatuses] = useState<
    Record<TemplateId, Status>
  >({
    welcome: "idle",
    "j3-inactive": "idle",
    "j7-churn": "idle",
    "daily-digest": "idle",
    "weekly-recap": "idle",
    "squad-activation": "idle",
  });

  async function runCron(cronId: CronId) {
    setCronStatuses((prev) => ({ ...prev, [cronId]: "loading" }));
    setCronResults((prev) => ({ ...prev, [cronId]: null }));

    try {
      const res = await fetch("/api/admin/test-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron: cronId }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setCronStatuses((prev) => ({ ...prev, [cronId]: "error" }));
        setCronResults((prev) => ({
          ...prev,
          [cronId]: json.error ?? "Erreur inconnue",
        }));
        toast.error(json.error ?? "Erreur cron");
        return;
      }

      setCronStatuses((prev) => ({ ...prev, [cronId]: "ok" }));
      const result = json.data?.result;
      const summary =
        result && typeof result === "object"
          ? JSON.stringify(result.data ?? result)
          : "OK";
      setCronResults((prev) => ({ ...prev, [cronId]: summary }));
      toast.success(`Cron « ${cronId} » exécuté !`);

      setTimeout(
        () => setCronStatuses((prev) => ({ ...prev, [cronId]: "idle" })),
        5000,
      );
    } catch {
      setCronStatuses((prev) => ({ ...prev, [cronId]: "error" }));
      toast.error("Erreur réseau");
    }
  }

  async function previewEmail(templateId: TemplateId) {
    setEmailStatuses((prev) => ({ ...prev, [templateId]: "loading" }));

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setEmailStatuses((prev) => ({ ...prev, [templateId]: "error" }));
        toast.error(json.error ?? "Erreur envoi");
        return;
      }

      setEmailStatuses((prev) => ({ ...prev, [templateId]: "ok" }));
      toast.success(`Preview « ${templateId} » envoyé à ${json.data?.to} !`);

      setTimeout(
        () => setEmailStatuses((prev) => ({ ...prev, [templateId]: "idle" })),
        5000,
      );
    } catch {
      setEmailStatuses((prev) => ({ ...prev, [templateId]: "error" }));
      toast.error("Erreur réseau");
    }
  }

  return (
    <div className="space-y-8">
      {/* Cron triggers */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Déclencher un cron (utilisateurs réels)
        </h2>
        <div className="space-y-3">
          {CRONS.map((c) => {
            const status = cronStatuses[c.id];
            const result = cronResults[c.id];
            return (
              <button
                key={c.id}
                type="button"
                disabled={status === "loading"}
                onClick={() => runCron(c.id)}
                className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
                  status === "ok"
                    ? "border-green-500/40 bg-green-500/10"
                    : status === "error"
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-white/8 bg-zinc-900 hover:border-white/20 hover:bg-zinc-800"
                }`}
              >
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{c.label}</p>
                  <p className="text-xs text-zinc-500">{c.description}</p>
                  {result && (
                    <p
                      className={`mt-1 truncate font-mono text-xs ${
                        status === "error" ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {result}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {status === "loading" ? (
                    <Loader2 className="size-4 animate-spin text-zinc-400" />
                  ) : status === "ok" ? (
                    <CheckCircle className="size-4 text-green-400" />
                  ) : status === "error" ? (
                    <XCircle className="size-4 text-red-400" />
                  ) : (
                    <Play className="size-4 text-zinc-500" />
                  )}
                </div>
              </button>
            );
          })}

          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-400">
            ⚠️ Ces boutons exécutent les crons pour vrai : des emails et push
            réels seront envoyés aux users éligibles.
          </p>
        </div>
      </section>

      {/* Email previews */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Prévisualiser un email (envoyé à toi)
        </h2>
        <p className="mb-3 text-xs text-zinc-600">
          Données fictives · reçu à ton adresse Supabase
        </p>
        <div className="space-y-2">
          {(
            [
              { id: "welcome", label: "Bienvenue", emoji: "🎉" },
              { id: "j3-inactive", label: "J+3 inactif", emoji: "📧" },
              { id: "j7-churn", label: "J+7 churn", emoji: "🙏" },
              { id: "daily-digest", label: "Daily Digest", emoji: "📊" },
              { id: "weekly-recap", label: "Weekly Recap", emoji: "📅" },
              { id: "squad-activation", label: "Solo Activation", emoji: "🏟️" },
            ] as { id: TemplateId; label: string; emoji: string }[]
          ).map((t) => {
            const status = emailStatuses[t.id];
            return (
              <button
                key={t.id}
                type="button"
                disabled={status === "loading"}
                onClick={() => previewEmail(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
                  status === "ok"
                    ? "border-green-500/40 bg-green-500/10"
                    : status === "error"
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-white/8 bg-zinc-900 hover:border-white/20 hover:bg-zinc-800"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <p className="flex-1 text-sm font-semibold text-white">
                  {t.label}
                </p>
                <div className="shrink-0">
                  {status === "loading" ? (
                    <Loader2 className="size-4 animate-spin text-zinc-400" />
                  ) : status === "ok" ? (
                    <CheckCircle className="size-4 text-green-400" />
                  ) : status === "error" ? (
                    <XCircle className="size-4 text-red-400" />
                  ) : (
                    <Mail className="size-4 text-zinc-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
