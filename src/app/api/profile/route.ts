import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { Database } from "@/types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,25}$/;
const AVATAR_MAX_LEN = 8;

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Corps invalide", 400);
  }

  const { username, avatar_url, favorite_team_id } = body as {
    username?: unknown;
    avatar_url?: unknown;
    favorite_team_id?: unknown;
  };

  const update: ProfileUpdate = {
    updated_at: new Date().toISOString(),
  };

  // ── Validation username ────────────────────────────────────────────────────
  if (username !== undefined) {
    if (typeof username !== "string" || !USERNAME_RE.test(username)) {
      return errorResponse(
        "Pseudo invalide (3-25 caractères, lettres/chiffres/_)",
        400,
      );
    }
    update.username = username;
  }

  // ── Validation avatar_url (emoji ou null) ──────────────────────────────────
  if (avatar_url !== undefined) {
    if (avatar_url !== null) {
      if (
        typeof avatar_url !== "string" ||
        avatar_url.length > AVATAR_MAX_LEN
      ) {
        return errorResponse("Avatar invalide", 400);
      }
      update.avatar_url = avatar_url;
    } else {
      update.avatar_url = null;
    }
  }

  // ── Validation favorite_team_id (UUID ou null) ─────────────────────────────
  if (favorite_team_id !== undefined) {
    if (favorite_team_id !== null) {
      if (typeof favorite_team_id !== "string") {
        return errorResponse("Équipe favorite invalide", 400);
      }
      const admin = createAdminClient();
      const { data: team } = await admin
        .from("teams")
        .select("id")
        .eq("id", favorite_team_id)
        .maybeSingle();
      if (!team) return errorResponse("Équipe introuvable", 404);
      update.favorite_team_id = favorite_team_id;
    } else {
      update.favorite_team_id = null;
    }
  }

  if (Object.keys(update).length === 1) {
    return errorResponse("Aucune modification envoyée", 400);
  }

  const admin = createAdminClient();

  // ── Unicité du username ────────────────────────────────────────────────────
  if (update.username) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", update.username)
      .neq("id", user.id)
      .maybeSingle();
    if (existing) return errorResponse("Ce pseudo est déjà pris", 409);
  }

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return errorResponse(error.message, 500);

  return successResponse({ updated: Object.keys(update) });
}
