import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquadsPageClient } from "@/components/squads/SquadsPageClient";

export const metadata = { title: "Mes ligues" };

export default async function SquadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
      <h1 className="text-xl font-black tracking-tight text-white">Mes ligues</h1>
      <p className="mt-1 text-xs font-semibold text-zinc-500">Squads persistantes — braquage sur tous tes matchs</p>
      <div className="mt-6">
        <SquadsPageClient userId={user.id} />
      </div>
    </main>
  );
}
