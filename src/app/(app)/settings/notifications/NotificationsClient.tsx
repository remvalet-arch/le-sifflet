"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Bell,
  Zap,
  Trophy,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  MessageCircle,
  Tv2,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { trySubscribePush, isPushSubscribed } from "@/components/pwa/PushOptIn";

type ToggleKey =
  | "notif_pre_match_5min"
  | "notif_pre_match_2h"
  | "notif_var_results"
  | "notif_prono_results"
  | "notif_daily_digest"
  | "notif_squad_chat"
  | "notif_dm"
  | "notif_friend_request"
  | "notif_fun_kop";

export default function NotificationsClient({
  userId,
  initialPreMatch5,
  initialPreMatch2h,
  initialVarResults,
  initialPronoResults,
  initialDailyDigest,
  initialSquadChat,
  initialDm,
  initialFriendRequest,
  initialFunKop,
}: {
  userId: string;
  initialPreMatch5: boolean;
  initialPreMatch2h: boolean;
  initialVarResults: boolean;
  initialPronoResults: boolean;
  initialDailyDigest: boolean;
  initialSquadChat: boolean;
  initialDm: boolean;
  initialFriendRequest: boolean;
  initialFunKop: boolean;
}) {
  const t = useTranslations("Notifications");

  const NOTIFICATION_GROUPS = [
    {
      title: t("groupVarTitle"),
      icon: Zap,
      items: [
        {
          key: "notif_var_results" as ToggleKey,
          label: t("varResultsLabel"),
          desc: t("varResultsDesc"),
        },
      ],
    },
    {
      title: t("groupPronosTitle"),
      icon: Trophy,
      items: [
        {
          key: "notif_prono_results" as ToggleKey,
          label: t("pronoResultsLabel"),
          desc: t("pronoResultsDesc"),
        },
      ],
    },
    {
      title: t("groupPreMatchTitle"),
      icon: Clock,
      items: [
        {
          key: "notif_pre_match_2h" as ToggleKey,
          label: t("preMatch2hLabel"),
          desc: t("preMatch2hDesc"),
        },
        {
          key: "notif_pre_match_5min" as ToggleKey,
          label: t("preMatch5minLabel"),
          desc: t("preMatch5minDesc"),
        },
      ],
    },
    {
      title: t("groupDailyTitle"),
      icon: BookOpen,
      items: [
        {
          key: "notif_daily_digest" as ToggleKey,
          label: t("dailyDigestLabel"),
          desc: t("dailyDigestDesc"),
        },
      ],
    },
    {
      title: t("groupLeaguesTitle"),
      icon: Users,
      items: [
        {
          key: "notif_squad_chat" as ToggleKey,
          label: t("squadChatLabel"),
          desc: t("squadChatDesc"),
        },
      ],
    },
    {
      title: t("groupFriendsTitle"),
      icon: MessageCircle,
      items: [
        {
          key: "notif_friend_request" as ToggleKey,
          label: t("friendRequestLabel"),
          desc: t("friendRequestDesc"),
        },
        {
          key: "notif_dm" as ToggleKey,
          label: t("dmLabel"),
          desc: t("dmDesc"),
        },
      ],
    },
    {
      title: t("groupKopTitle"),
      icon: Tv2,
      items: [
        {
          key: "notif_fun_kop" as ToggleKey,
          label: t("funKopLabel"),
          desc: t("funKopDesc"),
        },
      ],
    },
  ];

  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    notif_pre_match_5min: initialPreMatch5,
    notif_pre_match_2h: initialPreMatch2h,
    notif_var_results: initialVarResults,
    notif_prono_results: initialPronoResults,
    notif_daily_digest: initialDailyDigest,
    notif_squad_chat: initialSquadChat,
    notif_dm: initialDm,
    notif_friend_request: initialFriendRequest,
    notif_fun_kop: initialFunKop,
  });
  const [isPending, startTransition] = useTransition();
  const [subStatus, setSubStatus] = useState<
    "checking" | "subscribed" | "not_subscribed"
  >("checking");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    isPushSubscribed().then((ok) =>
      setSubStatus(ok ? "subscribed" : "not_subscribed"),
    );
  }, []);

  async function handleActivatePush() {
    setSubscribing(true);
    const result = await trySubscribePush();
    setSubscribing(false);
    if (result.ok) {
      setSubStatus("subscribed");
      toast.success(t("pushEnabled"));
    } else {
      const msg: Record<string, string> = {
        permission_denied: t("errorPermission"),
        push_not_supported: t("errorPushNotSupported"),
        no_vapid_key: t("errorNoVapidKey"),
        sw_not_ready: t("errorSwNotReady"),
      };
      const reason = result.reason.startsWith("subscribe_failed")
        ? t("errorSubscribeFailed")
        : (msg[result.reason] ?? `Erreur : ${result.reason}`);
      toast.error(reason, { duration: 6000 });
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
        toast.error(t("saveFailed"));
      } else {
        setValues((prev) => ({ ...prev, [key]: value }));
        toast.success(value ? t("toggleOn") : t("toggleOff"));
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="mb-6">
        <Breadcrumb
          className="mb-3"
          items={[
            { label: t("breadcrumbSettings"), href: "/settings" },
            { label: t("title") },
          ]}
        />
        <h1 className="text-xl font-semibold uppercase tracking-wide text-white">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
      </div>

      {/* Push subscription status */}
      {subStatus === "subscribed" ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/8 px-4 py-3">
          <CheckCircle className="size-4 shrink-0 text-green-400" />
          <p className="text-sm font-semibold text-green-300">
            {t("deviceRegistered")}
          </p>
        </div>
      ) : subStatus === "not_subscribed" ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">
                {t("deviceNotRegistered")}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {t("deviceNotRegisteredDesc")}
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
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bell className="size-4" />
            )}
            {subscribing ? t("activating") : t("activatePush")}
          </button>
        </div>
      ) : null}

      {/* Always-on notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/8 p-4">
        <Bell className="mt-0.5 size-4 shrink-0 text-yellow-400" />
        <p className="text-xs leading-relaxed text-zinc-300">
          <span className="font-bold text-yellow-400">
            {t("alwaysOnTitle")}
          </span>{" "}
          · {t("alwaysOnNote")}
        </p>
      </div>

      <div className="space-y-6">
        {NOTIFICATION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title}>
              <h2 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                <Icon className="size-3" />
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
                        className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
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
        {t("browserNote")}
      </p>
    </main>
  );
}
