import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInWithGoogleButton } from "@/components/auth/SignInWithGoogleButton";

export const metadata = { title: "Connexion — VAR Time" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/lobby");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/30 px-2.5 py-1 text-lg font-black tracking-widest text-white">
              VAR
            </span>
            <span className="text-xl font-black uppercase tracking-widest text-white">TIME</span>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Sécurise ton profil
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Un compte pour sauvegarder tes points et ton classement.
            </p>
          </div>
        </div>

        {/* Google button */}
        <SignInWithGoogleButton
          className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white font-bold text-zinc-800 shadow-md transition hover:bg-zinc-100 active:scale-[0.98]"
        >
          <GoogleIcon />
          Continuer avec Google
        </SignInWithGoogleButton>

        <p className="mt-6 text-center text-xs text-zinc-600">
          En continuant, tu acceptes de jouer fair-play.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
