import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WhistleLogo } from "@/components/ui/WhistleLogo";

export default async function SplashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/lobby");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <WhistleLogo size="xl" />

        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
            Le Sifflet
          </h1>
          <p className="mt-2 text-base text-zinc-400">
            Le deuxième écran des fans de foot
          </p>
        </div>

        <Link
          href="/login"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-green-500 text-base font-black uppercase tracking-wide text-zinc-950 shadow-md transition hover:bg-green-400 active:scale-[0.98]"
        >
          Rejoindre le Kop
        </Link>

        <p className="text-xs text-zinc-600">
          100% gratuit · Aucun argent réel
        </p>
      </div>
    </div>
  );
}
