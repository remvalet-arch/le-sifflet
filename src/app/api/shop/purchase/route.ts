import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

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
