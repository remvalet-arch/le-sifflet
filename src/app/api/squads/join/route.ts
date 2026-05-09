import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    let body: { invite_code?: string };
    try {
      body = (await request.json()) as { invite_code?: string };
    } catch (error) {
      log.error("squads-join", "Supabase error", { error: String(error) });
      return errorResponse("Corps JSON invalide", 400);
    }
    const { invite_code } = body;
    if (!invite_code?.trim()) return errorResponse("Code requis", 400);

    // Ne pas SELECT sur squads : la RLS masque les ligues privées aux non-membres.
    const { data: inviteRows, error: squadErr } = await supabase.rpc(
      "squad_by_invite_code",
      {
        p_invite: invite_code.trim(),
      },
    );

    if (squadErr) {
      log.error("squads-join", "squad_by_invite_code error", {
        error: String(squadErr),
      });
      return errorResponse(squadErr.message, 500);
    }
    const rows = inviteRows ?? [];
    const squad = rows[0];
    if (!squad)
      return errorResponse("Code invalide — vérifie et réessaie", 404);

    const { data: existing, error: existingErr } = await supabase
      .from("squad_members")
      .select("user_id")
      .eq("squad_id", squad.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      log.error("squads-join", "Check existing member error", {
        error: String(existingErr),
      });
      return errorResponse(existingErr.message, 500);
    }

    if (existing) return errorResponse("Tu es déjà dans cette ligue", 400);

    const { error } = await supabase
      .from("squad_members")
      .insert({ squad_id: squad.id, user_id: user.id });

    if (error) {
      log.error("squads-join", "Supabase error", { error: String(error) });
      return errorResponse(error.message, 500);
    }

    // Notifie le créateur de la ligue (fire-and-forget)
    void (async () => {
      const [{ data: joiner }, { data: owner }] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", user.id).single(),
        supabase
          .from("profiles")
          .select("id")
          .eq("id", squad.owner_id)
          .single(),
      ]);
      if (owner && owner.id !== user.id) {
        await sendPushToUsers([owner.id], {
          title: "🎉 Nouveau membre !",
          body: `${joiner?.username ?? "Quelqu'un"} a rejoint ta ligue ${squad.name} !`,
          url: `/ligues/${squad.id}`,
        });
      }
    })();

    return successResponse({ squad });
  } catch (error) {
    log.error("squads-join", "Unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}
