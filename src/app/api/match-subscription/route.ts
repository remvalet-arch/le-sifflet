import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

type Intent = "subscribe" | "mute" | "unmute";

/**
 * POST — abonnement aux notifications d’un match (table match_subscriptions).
 * subscribe : notifs actives · mute : abonné mais smart_mute · unmute : réactive les notifs.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  let body: { match_id?: string; intent?: string };
  try {
    body = (await request.json()) as { match_id?: string; intent?: string };
  } catch {
    return errorResponse("Corps JSON invalide", 400);
  }

  const { match_id, intent } = body;
  if (!match_id || !["subscribe", "mute", "unmute"].includes(intent ?? "")) {
    return errorResponse("Paramètres invalides", 400);
  }

  const i = intent as Intent;

  if (i === "subscribe" || i === "mute") {
    const smart_mute = i === "mute";
    const { error } = await supabase.from("match_subscriptions").upsert(
      {
        user_id: user.id,
        match_id,
        smart_mute,
      },
      { onConflict: "user_id,match_id" },
    );
    if (error) {
      console.error("[match-subscription]", error.message);
      return errorResponse(error.message, 500);
    }
    return successResponse({ smart_mute });
  }

  const { data: existing, error: selErr } = await supabase
    .from("match_subscriptions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("match_id", match_id)
    .maybeSingle();

  if (selErr) {
    console.error("[match-subscription]", selErr.message);
    return errorResponse(selErr.message, 500);
  }
  if (!existing) {
    return errorResponse("Pas encore abonné à ce match", 400);
  }

  const { error: upErr } = await supabase
    .from("match_subscriptions")
    .update({ smart_mute: false })
    .eq("user_id", user.id)
    .eq("match_id", match_id);

  if (upErr) {
    console.error("[match-subscription]", upErr.message);
    return errorResponse(upErr.message, 500);
  }
  return successResponse({ smart_mute: false });
}
