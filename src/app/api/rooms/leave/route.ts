import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as { room_id?: string };
  const { room_id } = body;
  if (!room_id) return errorResponse("room_id requis", 400);

  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", room_id)
    .eq("user_id", user.id);

  if (error) return errorResponse("Erreur lors de la sortie", 500);

  return successResponse({});
}
