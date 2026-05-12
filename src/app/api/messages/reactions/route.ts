import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "😮", "🔥", "👎"]);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    message_id?: unknown;
    emoji?: unknown;
  };
  const messageId =
    typeof body.message_id === "string" ? body.message_id : null;
  const emoji = typeof body.emoji === "string" ? body.emoji : null;

  if (!messageId || !emoji) return errorResponse("Paramètres manquants", 400);
  if (!ALLOWED_EMOJIS.has(emoji)) return errorResponse("Emoji invalide", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  // Toggle: insert or delete
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
    return successResponse({ action: "removed" });
  }

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });
  if (error) return errorResponse("Réaction échouée", 500);

  return successResponse({ action: "added" });
}
