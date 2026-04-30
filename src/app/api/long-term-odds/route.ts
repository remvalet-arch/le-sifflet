import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match_id");
  if (!matchId) return errorResponse("match_id manquant", 400);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("long_term_bets")
    .select("bet_value")
    .eq("match_id", matchId)
    .eq("bet_type", "exact_score");

  if (error) return errorResponse(error.message);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    counts[row.bet_value] = (counts[row.bet_value] ?? 0) + 1;
    total++;
  }

  return successResponse({ counts, total });
}
