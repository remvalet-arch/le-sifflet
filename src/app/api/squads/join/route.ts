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

    let body: { invite_code?: string };
    try {
      body = (await request.json()) as { invite_code?: string };
    } catch (error) {
      console.error("Supabase Error:", error);
      return errorResponse("Corps JSON invalide", 400);
    }
    const { invite_code } = body;
    if (!invite_code?.trim()) return errorResponse("Code requis", 400);

    const { data: squad, error: squadErr } = await supabase
      .from("squads")
      .select("*")
      .eq("invite_code", invite_code.trim().toUpperCase())
      .maybeSingle();

    if (squadErr) {
      console.error("Supabase Error:", squadErr);
      return errorResponse(squadErr.message, 500);
    }
    if (!squad) return errorResponse("Code invalide — vérifie et réessaie", 404);

    const { data: existing, error: existingErr } = await supabase
      .from("squad_members")
      .select("user_id")
      .eq("squad_id", squad.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      console.error("Supabase Error:", existingErr);
      return errorResponse(existingErr.message, 500);
    }

    if (existing) return errorResponse("Tu es déjà dans cette ligue", 400);

    const { error } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: user.id });

    if (error) {
      console.error("Supabase Error:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse({ squad });
  } catch (error) {
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
