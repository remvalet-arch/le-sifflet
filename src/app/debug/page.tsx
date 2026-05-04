import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Debug — VAR Time",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Smoke test : variables d’environnement + client serveur Supabase + session JWT.
 * Retirer ou protéger en production si besoin.
 */
export default async function DebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 font-sans text-slate-800">
        <h1 className="text-xl font-bold text-green-900">
          Variables manquantes
        </h1>
        <p className="mt-2 text-slate-600">
          Copiez <code className="rounded bg-slate-100 px-1">.env.example</code>{" "}
          vers <code className="rounded bg-slate-100 px-1">.env.local</code> et
          renseignez l’URL et la clé anon Supabase.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 font-sans text-slate-800">
      <h1 className="text-xl font-bold text-green-900">Supabase OK</h1>
      <p className="mt-2 text-sm text-slate-600">
        Projet :{" "}
        <span className="font-mono text-slate-800">
          {url.replace(/^https?:\/\//, "").split(".")[0]}…
        </span>
      </p>
      <p className="mt-4 text-sm">
        Session :{" "}
        {error ? (
          <span className="text-amber-700">
            JWT invalide ou absent ({error.message})
          </span>
        ) : user ? (
          <span className="text-green-700">
            connecté ({user.id.slice(0, 8)}…)
          </span>
        ) : (
          <span className="text-slate-600">
            non connecté (normal sans login)
          </span>
        )}
      </p>
    </div>
  );
}
