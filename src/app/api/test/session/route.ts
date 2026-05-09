/**
 * GET /api/test/session?email=xxx&secret=yyy
 *
 * DÉVELOPPEMENT UNIQUEMENT.
 * Signe l'utilisateur de test via signInWithPassword (server-side), pose les
 * cookies SSR Supabase, puis redirige vers /lobby.
 * Contourne le flow magic-link qui nécessite que localhost soit whitelisté
 * dans les redirect URLs Supabase.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const password = searchParams.get("password");
  const secret = searchParams.get("secret");

  if (!email || !password) {
    return NextResponse.json(
      { error: "email et password requis" },
      { status: 400 },
    );
  }
  if (
    !process.env.TEST_AUTH_SECRET ||
    secret !== process.env.TEST_AUTH_SECRET
  ) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: `Échec connexion : ${error.message}` },
      { status: 401 },
    );
  }

  // Les cookies de session sont posés via createClient → cookieStore.set()
  return NextResponse.redirect(new URL("/lobby", request.url));
}
