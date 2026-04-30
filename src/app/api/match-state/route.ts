import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { MatchStatus } from "@/types/database";

const VALID_STATUSES: MatchStatus[] = [
  "upcoming", "first_half", "half_time", "second_half", "paused", "finished",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score <= 150) {
    return errorResponse("Accès réservé aux modérateurs", 403);
  }

  const body = (await request.json()) as { match_id?: string; status?: string };
  const { match_id, status } = body;

  if (!match_id) return errorResponse("match_id manquant", 400);
  if (!status || !VALID_STATUSES.includes(status as MatchStatus)) {
    return errorResponse("Statut invalide", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({ status: status as MatchStatus })
    .eq("id", match_id)
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data);
}
