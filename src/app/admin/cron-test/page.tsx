import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { CronTestClient } from "./CronTestClient";

export const metadata = { title: "Admin — Test Crons" };

export default async function CronTestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) redirect("/lobby");

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link
        href="/admin/resolve"
        className="mb-6 flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Admin
      </Link>

      <h1 className="mb-1 text-xl font-black text-white">Test Crons</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Déclenche manuellement chaque cron automatique pour valider le
        comportement en conditions réelles.
      </p>

      <CronTestClient />
    </main>
  );
}
