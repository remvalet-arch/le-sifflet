import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  // Look for a non-dismissed recap from yesterday
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const recapDate = yesterday.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("user_daily_recaps")
    .select("*")
    .eq("user_id", user.id)
    .eq("recap_date", recapDate)
    .is("dismissed_at", null)
    .maybeSingle();

  if (error) return errorResponse(error.message);
  return successResponse({ recap: data ?? null });
}

export async function PATCH() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const recapDate = yesterday.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("user_daily_recaps")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("recap_date", recapDate);

  if (error) return errorResponse(error.message);
  return successResponse({ dismissed: true });
}
