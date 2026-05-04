import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

const REFILL_AMOUNT = 500;
const REFILL_THRESHOLD = 500;
const REFILL_COOLDOWN_HOURS = 24;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("sifflets_balance, last_refill_date")
    .eq("id", user.id)
    .single();

  if (!profile) return errorResponse("Profil introuvable", 404);

  if (profile.sifflets_balance >= REFILL_THRESHOLD) {
    return errorResponse("Solde suffisant, pas de refill disponible", 400);
  }

  const cutoff = new Date(Date.now() - REFILL_COOLDOWN_HOURS * 60 * 60 * 1000);

  if (profile.last_refill_date && new Date(profile.last_refill_date) > cutoff) {
    return errorResponse("Bonus déjà récupéré aujourd'hui", 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return errorResponse("Configuration serveur manquante", 500);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      sifflets_balance: profile.sifflets_balance + REFILL_AMOUNT,
      last_refill_date: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return errorResponse(error.message);

  return successResponse({
    new_balance: profile.sifflets_balance + REFILL_AMOUNT,
  });
}
