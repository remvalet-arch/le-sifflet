import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/constants/permissions";
import { PushTestClient } from "./PushTestClient";

export const metadata = { title: "Admin — Test Push" };

export default async function PushTestPage() {
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

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link
        href="/admin/resolve"
        className="mb-6 flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="size-4" />
        Admin
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-white">Test Push</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Envoie un push à ton propre appareil pour valider chaque scénario.
      </p>

      <PushTestClient userId={user.id} subscriptionCount={subs?.length ?? 0} />
    </main>
  );
}
