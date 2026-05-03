import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

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
      console.error("Supabase Error:", error);
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
      console.error("Supabase Error:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse({});
  } catch (error) {
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
