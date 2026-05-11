import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import type { NotificationRow } from "@/types/database";

export async function generateMetadata() {
  const t = await getTranslations("NotifCenter");
  return { title: t("pageTitle") };
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const t = await getTranslations("NotifCenter");
  const admin = createAdminClient();

  const { data: notifs } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark all as read
  if ((notifs ?? []).some((n) => !n.read)) {
    void admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-black uppercase tracking-wide text-white">
        {t("pageTitle")}
      </h1>

      {!notifs?.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-500">
          {t("emptyState")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(notifs as NotificationRow[]).map((n) => (
            <Link
              key={n.id}
              href={n.url ?? "#"}
              className="flex items-start gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800 active:scale-[0.99]"
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{n.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{n.body}</p>
              </div>
              <p className="shrink-0 text-[10px] text-zinc-600">
                {new Date(n.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
