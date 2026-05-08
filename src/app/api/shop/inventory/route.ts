import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data, error } = await supabase
    .from("user_shop_inventory")
    .select("shop_item_id, purchased_at, is_equipped")
    .eq("user_id", user.id);

  if (error) return errorResponse(error.message, 500);

  return successResponse(data ?? []);
}
