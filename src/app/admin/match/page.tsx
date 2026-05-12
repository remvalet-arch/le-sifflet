import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/constants/permissions";

export const metadata = { title: "Admin — Matchs" };

export default async function AdminMatchIndexPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !isAdminRole(profile.role)) redirect("/lobby");

  const { data: matches } = await supabase
    .from("matches")
    .select("id, team_home, team_away, status, start_time")
    .in("status", [
      "upcoming",
      "first_half",
      "half_time",
      "second_half",
      "paused",
    ])
    .order("start_time", { ascending: true })
    .limit(30);

  const STATUS_LABELS: Record<string, string> = {
    upcoming: "À venir",
    first_half: "1ère mi-temps",
    half_time: "Mi-temps",
    second_half: "2ème mi-temps",
    paused: "Interruption",
  };

  const STATUS_COLORS: Record<string, string> = {
    upcoming: "text-zinc-500",
    first_half: "text-green-400",
    half_time: "text-yellow-400",
    second_half: "text-green-400",
    paused: "text-orange-400",
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/resolve"
              className="text-xs text-zinc-500 hover:text-white"
            >
              ← Admin
            </Link>
            <h1 className="mt-1 text-2xl font-semibold uppercase tracking-widest text-whistle">
              Matchs
            </h1>
          </div>
        </div>

        {!matches || matches.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-500">
            Aucun match en cours ou à venir.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/admin/match/${m.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900 p-4 transition hover:bg-zinc-800 active:scale-[0.99]"
              >
                <div>
                  <p className="font-black text-white">
                    {m.team_home}{" "}
                    <span className="font-normal text-zinc-600">vs</span>{" "}
                    {m.team_away}
                  </p>
                  <p
                    className="mt-0.5 text-xs text-zinc-600"
                    suppressHydrationWarning
                  >
                    {m.start_time
                      ? new Date(m.start_time).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <span
                  className={`text-xs font-black uppercase tracking-wide ${STATUS_COLORS[m.status] ?? "text-zinc-500"}`}
                >
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
