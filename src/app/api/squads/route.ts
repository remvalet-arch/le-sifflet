import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/db-rate-limiter";

/** GET — toutes les squads dont l'utilisateur est membre (+ membres + username). */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    const { data: memberRows, error: mErr } = await supabase
      .from("squad_members")
      .select("squad_id")
      .eq("user_id", user.id);

    if (mErr) {
      log.error("squads", "Get member_rows error", { error: mErr.message });
      return errorResponse(mErr.message, 500);
    }

    const ids = [...new Set((memberRows ?? []).map((r) => r.squad_id))];
    const squadIdSet = new Set(ids);
    if (ids.length === 0) return successResponse({ squads: [] });

    const { data: squads, error: sErr } = await supabase
      .from("squads")
      .select("*")
      .in("id", ids);
    if (sErr) {
      log.error("squads", "Get squads error", { error: sErr.message });
      return errorResponse(sErr.message, 500);
    }

    const { data: allMembers, error: amErr } = await supabase.rpc(
      "squad_members_for_my_squads",
    );
    if (amErr) {
      log.error("squads", "RPC squad_members_for_my_squads error", {
        error: amErr.message,
      });
      return errorResponse(amErr.message, 500);
    }
    const membersInSquads = (allMembers ?? []).filter((m) =>
      squadIdSet.has(m.squad_id),
    );

    const userIds = [...new Set(membersInSquads.map((m) => m.user_id))];
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, xp, sifflets_balance")
      .in("id", userIds);
    if (pErr) {
      log.error("squads", "Get profiles error", { error: pErr.message });
      return errorResponse(pErr.message, 500);
    }
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          username: p.username,
          xp: p.xp ?? 0,
          sifflets_balance: p.sifflets_balance ?? 0,
        },
      ]),
    );

    const adminSupabase = createAdminClient();

    const { data: userPronos } = await adminSupabase
      .from("pronos")
      .select("user_id, points_earned")
      .in("user_id", userIds)
      .gt("points_earned", 0);

    const { data: userBets } = await adminSupabase
      .from("bets")
      .select("user_id, potential_reward, amount_staked")
      .in("user_id", userIds)
      .eq("status", "won");

    const totalPointsMap = new Map<string, number>();
    for (const p of userPronos ?? []) {
      totalPointsMap.set(
        p.user_id,
        (totalPointsMap.get(p.user_id) ?? 0) + p.points_earned,
      );
    }
    for (const b of userBets ?? []) {
      const netGain = b.potential_reward - b.amount_staked;
      if (netGain > 0) {
        totalPointsMap.set(
          b.user_id,
          (totalPointsMap.get(b.user_id) ?? 0) + netGain,
        );
      }
    }

    const squadsPayload = (squads ?? []).map((s) => {
      const members = membersInSquads
        .filter((m) => m.squad_id === s.id)
        .map((m) => {
          const p = profileMap.get(m.user_id);
          return {
            user_id: m.user_id,
            username: p?.username ?? "?",
            xp: totalPointsMap.get(m.user_id) ?? 0,
            sifflets_balance: p?.sifflets_balance ?? 0,
          };
        });
      const pot_commun = members.reduce((sum, m) => sum + m.xp, 0);
      return {
        ...s,
        members,
        pot_commun,
      };
    });

    return successResponse({ squads: squadsPayload });
  } catch (error) {
    log.error("squads", "GET unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}

/** POST — créer une squad + adhésion owner. */
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
      "create-squad",
    );
    if (limited)
      return errorResponse(
        `Trop de requêtes — réessaie dans ${retryAfter}s`,
        429,
      );

    let body: { name?: string; is_private?: boolean };
    try {
      body = (await request.json()) as { name?: string; is_private?: boolean };
    } catch (error) {
      log.warn("squads", "Invalid JSON body", { error: String(error) });
      return errorResponse("Corps JSON invalide", 400);
    }
    const { name, is_private = true } = body;

    if (!name?.trim()) return errorResponse("Paramètres manquants", 400);
    if (name.trim().length > 30)
      return errorResponse("Nom trop long (30 car. max)", 400);

    const { data: rows, error: rpcErr } = await supabase.rpc(
      "create_squad_atomic",
      {
        p_name: name.trim(),
        p_is_private: is_private,
        p_owner_id: user.id,
      },
    );

    const squad = rows?.[0];
    if (rpcErr ?? !squad) {
      if (rpcErr)
        log.error("squads", "create_squad_atomic error", {
          error: rpcErr.message,
        });
      return errorResponse(
        rpcErr?.message ?? "Erreur lors de la création",
        500,
      );
    }

    return successResponse(
      {
        squad: {
          ...squad,
          members: [{ user_id: user.id, username: "Toi" }],
        },
      },
      201,
    );
  } catch (error) {
    log.error("squads", "POST unexpected error", { error: String(error) });
    return errorResponse("Erreur serveur", 500);
  }
}
