"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignInWithGoogleButton } from "@/components/auth/SignInWithGoogleButton";

const btnClass =
  "inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-whistle px-6 py-3 text-sm font-black uppercase tracking-wide text-pitch-900 shadow-[0_4px_0_var(--color-whistle-dark)] transition hover:bg-[#fde047] active:translate-y-1 active:shadow-none sm:w-auto";

export function HomeAuthCtas() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div
        className="h-12 w-full max-w-xs rounded-full bg-white/10"
        aria-hidden
      />
    );
  }

  if (loggedIn) {
    return (
      <Link href="/lobby" className={btnClass}>
        Entrer sur le terrain
      </Link>
    );
  }

  return (
    <SignInWithGoogleButton className={btnClass}>
      Continuer avec Google
    </SignInWithGoogleButton>
  );
}
