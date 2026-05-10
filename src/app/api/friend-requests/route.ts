import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/db-rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    const { limited, retryAfter } = await checkRateLimit(
      supabase,
      user.id,
      "friend-request",
    );
    if (limited)
      return errorResponse(
        `Trop de requêtes — réessaie dans ${retryAfter}s`,
        429,
      );

    let body: { receiver_id?: string };
    try {
      body = (await request.json()) as { receiver_id?: string };
    } catch (error) {
      log.warn("friend-requests", "Invalid JSON body", {
        error: String(error),
      });
      return errorResponse("Corps JSON invalide", 400);
    }

    const { receiver_id } = body;
    if (!receiver_id?.trim())
      return errorResponse("Destinataire manquant", 400);
    if (receiver_id === user.id)
      return errorResponse("Tu ne peux pas t'ajouter toi-même", 400);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id })
      .select("id")
      .single();

    if (error) {
      log.error("friend-requests", "Insert error", { error: error.message });
      return errorResponse(error.message, 500);
    }

    return successResponse({ id: data.id }, 201);
  } catch (error) {
    log.error("friend-requests", "Unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    let body: { request_id?: string };
    try {
      body = (await request.json()) as { request_id?: string };
    } catch (error) {
      log.warn("friend-requests", "Invalid JSON body", {
        error: String(error),
      });
      return errorResponse("Corps JSON invalide", 400);
    }

    const { request_id } = body;
    if (!request_id?.trim()) return errorResponse("ID manquant", 400);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("friend_requests")
      .delete()
      .eq("id", request_id)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      log.error("friend-requests", "Delete error", { error: error.message });
      return errorResponse(error.message, 500);
    }

    return successResponse({ ok: true });
  } catch (error) {
    log.error("friend-requests", "Unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}
