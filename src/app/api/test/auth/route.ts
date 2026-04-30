/**
 * GET /api/test/auth?email=xxx&secret=yyy
 *
 * Endpoint DÉVELOPPEMENT UNIQUEMENT.
 * Génère un magic link Supabase pour un utilisateur de test existant.
 * Utilisé par les tests Playwright pour bypasser Google OAuth.
 *
 * Protégé par TEST_AUTH_SECRET dans .env.local.
 * Bloqué en production (NODE_ENV === 'production').
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const email  = searchParams.get("email");
  const secret = searchParams.get("secret");

  if (!email) {
    return NextResponse.json({ error: "email manquant" }, { status: 400 });
  }
  if (!process.env.TEST_AUTH_SECRET || secret !== process.env.TEST_AUTH_SECRET) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? "Impossible de générer le lien" },
      { status: 500 },
    );
  }

  return NextResponse.json({ action_link: data.properties.action_link });
}
