"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInWithGoogleButton({
  className = "",
  children = "Continuer avec Google",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  async function signIn() {
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      window.location.assign(
        `/?error=oauth&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  return (
    <button type="button" onClick={() => void signIn()} className={className}>
      {children}
    </button>
  );
}
