import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/constants/permissions";
import { PressOutreachClient } from "./PressOutreachClient";

export const metadata = { title: "Admin — Press Outreach" };

export default async function PressOutreachPage() {
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/admin/resolve"
        className="mb-6 flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="size-4" />
        Admin
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-white">Press Outreach</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Génère un email personnalisé pour chaque journaliste ou influenceur.
        Relis, ajuste en 2 min, envoie depuis ton Gmail.
      </p>

      <PressOutreachClient />
    </main>
  );
}
