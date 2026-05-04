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
    .select("sifflets_balance")
    .eq("id", user.id)
    .single();

  if (!profile) return errorResponse("Profil introuvable", 404);

  if (profile.sifflets_balance >= 10) {
    return errorResponse("Solde suffisant", 400);
  }

  const admin = createAdminClient();
  const newBalance = profile.sifflets_balance + 50;

  const { error } = await admin
    .from("profiles")
    .update({ sifflets_balance: newBalance })
    .eq("id", user.id);

  if (error) {
    console.error("[claim-rsa] Erreur recrédit:", error.message);
    return errorResponse("Erreur lors du recrédit", 500);
  }

  return successResponse({ new_balance: newBalance });
}
