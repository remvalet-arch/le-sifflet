import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as { invite_code?: string };
  const { invite_code } = body;
  if (!invite_code?.trim()) return errorResponse("Code requis", 400);

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("invite_code", invite_code.trim().toUpperCase())
    .maybeSingle();

  if (!room) return errorResponse("Code invalide — vérifie et réessaie", 404);

  // Déjà membre ?
  const { data: existing } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return errorResponse("Tu es déjà dans cette ligue", 400);

  // Déjà dans une autre room pour ce match ?
  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  if (memberships?.length) {
    const { data: conflict } = await supabase
      .from("rooms")
      .select("id")
      .eq("match_id", room.match_id)
      .in(
        "id",
        memberships.map((m) => m.room_id),
      )
      .maybeSingle();
    if (conflict) return errorResponse("Tu es déjà dans une ligue pour ce match", 400);
  }

  const { error } = await supabase
    .from("room_members")
    .insert({ room_id: room.id, user_id: user.id });

  if (error) return errorResponse("Erreur lors de l'adhésion", 500);

  return successResponse({ room });
}
