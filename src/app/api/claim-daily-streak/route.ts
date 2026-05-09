import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "sifflets_balance, login_streak, last_login_date, lifetime_points_earned",
    )
    .eq("id", user.id)
    .single();

  if (!profile) return errorResponse("Profil introuvable", 404);

  const todayStr = new Date().toISOString().slice(0, 10);
  if (profile.last_login_date === todayStr) {
    return errorResponse("Déjà réclamé aujourd'hui", 400);
  }

  const streak = profile.login_streak ?? 0;
  const bonus = 50 * Math.min(streak, 7);

  const admin = createAdminClient();
  // lifetime_points_earned += bonus déclenche le trigger trg_sync_season_points
  // qui incrémente season_points automatiquement (migration 0081)
  const { error } = await admin
    .from("profiles")
    .update({
      sifflets_balance: profile.sifflets_balance + bonus,
      lifetime_points_earned: (profile.lifetime_points_earned ?? 0) + bonus,
      last_login_date: todayStr,
    })
    .eq("id", user.id);

  if (error) return errorResponse("Erreur lors de la réclamation", 500);

  return successResponse({
    bonus,
    new_balance: profile.sifflets_balance + bonus,
    streak,
  });
}
