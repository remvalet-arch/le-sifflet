import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInWithGoogleButton } from "@/components/auth/SignInWithGoogleButton";
import { GoogleOAuthProvider } from "@react-oauth/google";

export const metadata = { title: "Connexion — VAR Time" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/lobby");

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/30 px-2.5 py-1 text-lg font-black tracking-widest text-white">
                VAR
              </span>
              <span className="text-xl font-black uppercase tracking-widest text-white">
                TIME
              </span>
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
          <div className="mt-8 flex justify-center w-full">
            <SignInWithGoogleButton />
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            En continuant, tu acceptes de jouer fair-play.
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
