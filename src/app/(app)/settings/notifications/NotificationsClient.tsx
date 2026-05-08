"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Bell, ChevronLeft, Zap, Trophy, BookOpen, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trySubscribePush, isPushSubscribed } from "@/components/pwa/PushOptIn";

type ToggleKey =
  | "notif_pre_match_5min"
  | "notif_pre_match_2h"
  | "notif_var_results"
  | "notif_prono_results"
  | "notif_daily_digest";

const NOTIFICATION_GROUPS = [
  {
    title: "Paris VAR",
    icon: Zap,
    items: [
      {
        key: "notif_var_results" as ToggleKey,
        label: "Résultats VAR",
        desc: "Reçois le verdict de chaque pari VAR avec ton gain ou ta perte explicite.",
      },
    ],
  },
  {
    title: "Pronos",
    icon: Trophy,
    items: [
      {
        key: "notif_prono_results" as ToggleKey,
        label: "Résultats de match",
        desc: "Push personnalisé à la fin du match avec tes points de pronos gagnés.",
      },
    ],
  },
  {
    title: "Rappels pré-match",
    icon: Clock,
    items: [
      {
        key: "notif_pre_match_2h" as ToggleKey,
        label: "2h avant le coup d'envoi",
        desc: "Rappel pour faire tes pronos avant la fermeture des paris.",
      },
      {
        key: "notif_pre_match_5min" as ToggleKey,
        label: "5 min avant le coup d'envoi",
        desc: "Push imminent pour rejoindre la LiveRoom et activer le mode Stade.",
      },
    ],
  },
  {
    title: "Bilan quotidien",
    icon: BookOpen,
    items: [
      {
        key: "notif_daily_digest" as ToggleKey,
        label: "Bilan du matin (09h00)",
        desc: "Récap de tes gains de la veille avec ton classement mis à jour.",
      },
    ],
  },
];

export default function NotificationsClient({
  userId,
  initialPreMatch5,
  initialPreMatch2h,
  initialVarResults,
  initialPronoResults,
  initialDailyDigest,
}: {
  userId: string;
  initialPreMatch5: boolean;
  initialPreMatch2h: boolean;
  initialVarResults: boolean;
  initialPronoResults: boolean;
  initialDailyDigest: boolean;
}) {
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    notif_pre_match_5min: initialPreMatch5,
    notif_pre_match_2h: initialPreMatch2h,
    notif_var_results: initialVarResults,
    notif_prono_results: initialPronoResults,
    notif_daily_digest: initialDailyDigest,
  });
  const [isPending, startTransition] = useTransition();
  const [subStatus, setSubStatus] = useState<"checking" | "subscribed" | "not_subscribed">("checking");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    isPushSubscribed().then((ok) =>
      setSubStatus(ok ? "subscribed" : "not_subscribed"),
    );
  }, []);

  async function handleActivatePush() {
    setSubscribing(true);
    const ok = await trySubscribePush();
    setSubscribing(false);
    if (ok) {
      setSubStatus("subscribed");
      toast.success("Notifications push activées !");
    } else {
      toast.error(
        Notification.permission === "denied"
          ? "Notifications bloquées — autorise-les dans les réglages iOS/Safari."
          : "Impossible d'activer les notifications push.",
      );
    }
  }

  function handleToggle(key: ToggleKey, value: boolean) {
    startTransition(async () => {
      const supabase = createClient();
      // Build a typed update object to avoid index-signature TS errors with computed keys
      const update: { [K in ToggleKey]?: boolean } = {};
      update[key] = value;
      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", userId);
      if (error) {
        toast.error("Impossible de sauvegarder.");
      } else {
        setValues((prev) => ({ ...prev, [key]: value }));
        toast.success(
          value ? "Notification activée !" : "Notification désactivée.",
        );
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 transition hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Notifications
          </h1>
          <p className="text-sm text-zinc-400">Choisis ce qui te réveille.</p>
        </div>
      </div>

      {/* Push subscription status */}
      {subStatus === "subscribed" ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/8 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
          <p className="text-sm font-semibold text-green-300">
            Cet appareil est bien enregistré pour recevoir les notifications.
          </p>
        </div>
      ) : subStatus === "not_subscribed" ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">
                Cet appareil n&apos;est pas encore enregistré
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Les préférences ci-dessous sont sauvegardées, mais aucune
                notification ne sera reçue tant que tu n&apos;as pas activé
                le canal push sur cet appareil.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleActivatePush}
            disabled={subscribing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-zinc-900 transition active:scale-[0.98] disabled:opacity-60"
          >
            {subscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {subscribing ? "Activation…" : "Activer les notifications push"}
          </button>
        </div>
      ) : null}

      {/* Always-on notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/8 p-4">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
        <p className="text-xs leading-relaxed text-zinc-300">
          <span className="font-bold text-yellow-400">Alertes VAR</span> — les
          notifs d&apos;ouverture de marché sont toujours actives. C&apos;est la
          mécanique principale de l&apos;app et elles ne peuvent pas être
          désactivées ici.
        </p>
      </div>

      <div className="space-y-6">
        {NOTIFICATION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title}>
              <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <Icon className="h-3 w-3" />
                {group.title}
              </h2>
              <div className="rounded-2xl border border-white/8 bg-zinc-900">
                {group.items.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 p-5 ${
                      idx > 0 ? "border-t border-white/8" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        {item.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={values[item.key]}
                      aria-label={item.label}
                      onClick={() => handleToggle(item.key, !values[item.key])}
                      disabled={isPending}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                        values[item.key] ? "bg-yellow-400" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          values[item.key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[10px] text-zinc-600">
        Les notifs sont envoyées via Web Push — vérifie aussi les autorisations
        de ton navigateur si tu ne reçois rien.
      </p>
    </main>
  );
}
