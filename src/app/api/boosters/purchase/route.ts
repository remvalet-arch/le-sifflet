import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
} from "@/lib/api-response";

const BOOSTER_RATE_LIMIT = 10;
const BOOSTER_WINDOW_SECS = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const since = new Date(Date.now() - BOOSTER_WINDOW_SECS * 1000).toISOString();
  const { count } = await supabase
    .from("user_boosters_inventory")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("acquired_at", since);
  if ((count ?? 0) >= BOOSTER_RATE_LIMIT)
    return rateLimitResponse(BOOSTER_WINDOW_SECS);

  let body: { booster_id?: string; quantity?: number };
  try {
    body = (await req.json()) as { booster_id?: string; quantity?: number };
  } catch {
    return errorResponse("Corps JSON invalide");
  }

  const { booster_id, quantity = 1 } = body;
  if (!booster_id) return errorResponse("booster_id requis");

  const { data, error } = await supabase.rpc("purchase_booster", {
    p_booster_id: booster_id,
    p_quantity: quantity,
  });

  if (error) return errorResponse(error.message, 500);

  const result = data as {
    ok: boolean;
    error?: string;
    new_balance?: number;
    quantity?: number;
  };
  if (!result.ok) return errorResponse(result.error ?? "Achat impossible");

  return successResponse({
    new_balance: result.new_balance,
    quantity: result.quantity,
  });
}
