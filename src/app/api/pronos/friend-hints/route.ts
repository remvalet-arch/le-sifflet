import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return errorResponse("matchId manquant", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data, error } = await supabase.rpc("get_friend_pronos", {
    p_match_id: matchId,
    p_user_id: user.id,
  });

  if (error) return errorResponse(error.message);
  return successResponse({ hints: data ?? [] });
}
