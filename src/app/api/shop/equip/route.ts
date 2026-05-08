import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  let body: { item_id?: string; unequip_category?: string };
  try {
    body = (await req.json()) as {
      item_id?: string;
      unequip_category?: string;
    };
  } catch {
    return errorResponse("Corps JSON invalide");
  }

  if (body.unequip_category) {
    const { data, error } = await supabase.rpc("unequip_shop_item", {
      p_category: body.unequip_category,
    });
    if (error) return errorResponse(error.message, 500);
    const result = data as { ok: boolean; error?: string };
    if (!result.ok)
      return errorResponse(result.error ?? "Déséquipement impossible");
    return successResponse({ unequipped: body.unequip_category });
  }

  const { item_id } = body;
  if (!item_id) return errorResponse("item_id requis");

  const { data, error } = await supabase.rpc("equip_shop_item", {
    p_item_id: item_id,
  });

  if (error) return errorResponse(error.message, 500);

  const result = data as { ok: boolean; category?: string; error?: string };
  if (!result.ok) return errorResponse(result.error ?? "Équipement impossible");

  return successResponse({ category: result.category });
}
