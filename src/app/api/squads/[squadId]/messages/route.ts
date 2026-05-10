import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { checkRateLimit } from "@/lib/db-rate-limiter";

const CHAT_PUSH_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_CHARS = 200;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ squadId: string }> },
) {
  const { squadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { limited, retryAfter } = await checkRateLimit(
    supabase,
    user.id,
    "squad-message",
  );
  if (limited)
    return errorResponse(
      `Trop de requêtes — réessaie dans ${retryAfter}s`,
      429,
    );

  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content || content.length === 0)
    return errorResponse("Message vide", 400);
  if (content.length > MAX_CHARS)
    return errorResponse("Message trop long", 400);

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est membre de la squad
  const { data: membership } = await admin
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squadId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return errorResponse("Non membre de cette ligue", 403);

  // Insérer le message
  const { data: msg, error: insertErr } = await admin
    .from("squad_messages")
    .insert({ squad_id: squadId, user_id: user.id, content })
    .select("id, created_at")
    .single();

  if (insertErr) return errorResponse(insertErr.message);

  // Push notification (fire-and-forget)
  void (async () => {
    const { data: squad } = await admin
      .from("squads")
      .select("id, name, chat_last_push_at")
      .eq("id", squadId)
      .single();

    if (!squad) return;

    // Cooldown 30 min
    if (squad.chat_last_push_at) {
      const elapsed = Date.now() - new Date(squad.chat_last_push_at).getTime();
      if (elapsed < CHAT_PUSH_COOLDOWN_MS) return;
    }

    // Membres ayant le toggle activé (hors expéditeur)
    const { data: members } = await admin
      .from("squad_members")
      .select("user_id")
      .eq("squad_id", squadId)
      .neq("user_id", user.id);

    if (!members?.length) return;

    const memberIds = members.map((m) => m.user_id);

    const [profilesRes, senderRes] = await Promise.all([
      admin.from("profiles").select("id, notif_squad_chat").in("id", memberIds),
      admin.from("profiles").select("username").eq("id", user.id).single(),
    ]);

    const eligibleIds = (profilesRes.data ?? [])
      .filter((p) => p.notif_squad_chat)
      .map((p) => p.id);

    if (eligibleIds.length === 0) return;

    const pseudo = senderRes.data?.username ?? "Un coéquipier";
    const preview = content.length > 50 ? `${content.slice(0, 50)}…` : content;

    await Promise.all([
      sendPushToUsers(eligibleIds, {
        title: `💬 ${pseudo} dans ${squad.name}`,
        body: preview,
        url: `/ligues`,
      }),
      admin
        .from("squads")
        .update({ chat_last_push_at: new Date().toISOString() })
        .eq("id", squadId),
    ]);
  })();

  return successResponse({ id: msg?.id });
}
