import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
} from "@/lib/api-response";

const SHOP_RATE_LIMIT = 10;
const SHOP_WINDOW_SECS = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const since = new Date(Date.now() - SHOP_WINDOW_SECS * 1000).toISOString();
  const { count } = await supabase
    .from("user_shop_inventory")
    .select("shop_item_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("purchased_at", since);
  if ((count ?? 0) >= SHOP_RATE_LIMIT)
    return rateLimitResponse(SHOP_WINDOW_SECS);

  let body: { item_id?: string };
  try {
    body = (await req.json()) as { item_id?: string };
  } catch {
    return errorResponse("Corps JSON invalide");
  }

  const { item_id } = body;
  if (!item_id) return errorResponse("item_id requis");

  const { data, error } = await supabase.rpc("purchase_shop_item", {
    p_item_id: item_id,
  });

  if (error) return errorResponse(error.message, 500);

  const result = data as {
    ok: boolean;
    error?: string;
    new_balance?: number;
    item_id?: string;
    free?: boolean;
  };

  if (!result.ok) return errorResponse(result.error ?? "Achat impossible");

  return successResponse({
    new_balance: result.new_balance,
    item_id: result.item_id,
    free: result.free,
  });
}
