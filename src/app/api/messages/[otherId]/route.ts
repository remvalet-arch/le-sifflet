import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { checkRateLimit } from "@/lib/db-rate-limiter";

const MAX_CHARS = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ otherId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  const { limited, retryAfter } = await checkRateLimit(
    supabase,
    user.id,
    "direct-message",
  );
  if (limited)
    return errorResponse(
      `Trop de requêtes — réessaie dans ${retryAfter}s`,
      429,
    );

  const { otherId } = await params;
  if (!otherId || otherId === user.id)
    return errorResponse("Destinataire invalide", 400);

  const body = (await request.json()) as { content?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : null;

  if (!content || content.length === 0)
    return errorResponse("Message vide", 400);
  if (content.length > MAX_CHARS)
    return errorResponse(
      `Message trop long (max ${MAX_CHARS} caractères)`,
      400,
    );

  // Vérification amitié acceptée
  const admin = createAdminClient();
  const { data: friendship } = await admin
    .from("friend_requests")
    .select("id")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`,
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (!friendship) return errorResponse("Pas encore amis", 403);

  // Ordre canonique pour l'unicité du thread
  const [userA, userB] = [user.id, otherId].sort();

  // Upsert du thread
  const { data: thread, error: threadErr } = await admin
    .from("direct_message_threads")
    .upsert(
      { user_a_id: userA, user_b_id: userB },
      { onConflict: "user_a_id,user_b_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (threadErr || !thread)
    return errorResponse("Impossible d'ouvrir la conversation", 500);

  // Insert du message
  const { error: msgErr } = await admin.from("direct_messages").insert({
    thread_id: thread.id,
    sender_id: user.id,
    content,
  });

  if (msgErr) return errorResponse("Envoi échoué", 500);

  // Mise à jour du thread (preview + horodatage)
  await admin
    .from("direct_message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 80),
    })
    .eq("id", thread.id);

  // Push vers le destinataire si notif_dm=true
  const { data: recipient } = await admin
    .from("profiles")
    .select("username, notif_dm")
    .eq("id", otherId)
    .maybeSingle();

  const { data: sender } = await admin
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (recipient?.notif_dm && sender) {
    void sendPushToUsers([otherId], {
      title: `💬 ${sender.username}`,
      body: "Nouveau message",
      url: `/messages/${user.id}`,
    });
  }

  return successResponse({ thread_id: thread.id });
}
