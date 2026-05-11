import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { Database } from "@/types/database";
import { USERNAME_RE, isReservedUsername } from "@/lib/username";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const AVATAR_MAX_LEN = 8;
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

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

  const { username, avatar_url, favorite_team_id, preferred_competitions } =
    body as {
      username?: unknown;
      avatar_url?: unknown;
      favorite_team_id?: unknown;
      preferred_competitions?: unknown;
    };

  const update: ProfileUpdate = {
    updated_at: new Date().toISOString(),
  };

  // ── Validation username ────────────────────────────────────────────────────
  if (username !== undefined) {
    if (typeof username !== "string" || !USERNAME_RE.test(username)) {
      return errorResponse(
        "Pseudo invalide (3-20 caractères, lettres/chiffres/_/-)",
        400,
      );
    }
    if (isReservedUsername(username)) {
      return errorResponse("Ce pseudo est réservé", 400);
    }

    const admin = createAdminClient();
    const { data: currentProfile } = await admin
      .from("profiles")
      .select("username_last_changed_at")
      .eq("id", user.id)
      .single();

    if (currentProfile?.username_last_changed_at) {
      const elapsed =
        Date.now() -
        new Date(currentProfile.username_last_changed_at).getTime();
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const nextChange = new Date(
          new Date(currentProfile.username_last_changed_at).getTime() +
            USERNAME_COOLDOWN_MS,
        );
        return errorResponse(
          `Tu pourras changer ton pseudo le ${nextChange.toLocaleDateString("fr-FR")}`,
          429,
        );
      }
    }

    update.username = username;
    update.username_last_changed_at = new Date().toISOString();
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

  // ── Validation preferred_competitions (UUID[] ou null) ────────────────────
  if (preferred_competitions !== undefined) {
    if (preferred_competitions === null) {
      update.preferred_competitions = null;
    } else if (
      Array.isArray(preferred_competitions) &&
      preferred_competitions.every((id) => typeof id === "string")
    ) {
      update.preferred_competitions = preferred_competitions as string[];
    } else {
      return errorResponse("preferred_competitions invalide", 400);
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
