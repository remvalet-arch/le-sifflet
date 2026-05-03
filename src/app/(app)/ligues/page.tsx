import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiguesPageClient } from "@/components/ligues/LiguesPageClient";

export const metadata = { title: "Ligues — Vestiaire" };

export default async function LiguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
      <h1 className="text-xl font-black tracking-tight text-white">Ligues</h1>
      <p className="mt-1 text-xs font-semibold text-zinc-500">
        Vestiaire — braquage, pot commun, classement
      </p>
      <div className="mt-6">
        <LiguesPageClient userId={user.id} />
      </div>
    </main>
  );
}
