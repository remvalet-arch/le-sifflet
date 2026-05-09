import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    let body: { squad_id?: string };
    try {
      body = (await request.json()) as { squad_id?: string };
    } catch (error) {
      log.error("squads-leave", "Supabase error", { error: String(error) });
      return errorResponse("Corps JSON invalide", 400);
    }
    const { squad_id } = body;
    if (!squad_id) return errorResponse("squad_id requis", 400);

    const { error } = await supabase
      .from("squad_members")
      .delete()
      .eq("squad_id", squad_id)
      .eq("user_id", user.id);

    if (error) {
      log.error("squads-leave", "Supabase error", { error: String(error) });
      return errorResponse(error.message, 500);
    }

    return successResponse({});
  } catch (error) {
    log.error("squads-leave", "Unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}
