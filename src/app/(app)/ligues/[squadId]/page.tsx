import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquadDetailClient } from "@/components/ligues/SquadDetailClient";

type Props = { params: Promise<{ squadId: string }> };

export default async function LigueDetailPage({ params }: Props) {
  const { squadId } = await params;
  if (!squadId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: membership } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("squad_id", squadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/ligues");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
      <SquadDetailClient squadId={squadId} currentUserId={user.id} />
    </main>
  );
}
