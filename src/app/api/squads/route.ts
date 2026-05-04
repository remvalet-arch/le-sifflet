import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

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
      console.error("Supabase Error:", mErr);
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
      console.error("Supabase Error:", sErr);
      return errorResponse(sErr.message, 500);
    }

    const { data: allMembers, error: amErr } = await supabase.rpc(
      "squad_members_for_my_squads",
    );
    if (amErr) {
      console.error("Supabase Error:", amErr);
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
      console.error("Supabase Error:", pErr);
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

    const squadsPayload = (squads ?? []).map((s) => {
      const members = membersInSquads
        .filter((m) => m.squad_id === s.id)
        .map((m) => {
          const p = profileMap.get(m.user_id);
          return {
            user_id: m.user_id,
            username: p?.username ?? "?",
            xp: p?.xp ?? 0,
            sifflets_balance: p?.sifflets_balance ?? 0,
          };
        });
      const pot_commun = members.reduce(
        (sum, m) => sum + m.sifflets_balance,
        0,
      );
      return {
        ...s,
        members,
        pot_commun,
      };
    });

    return successResponse({ squads: squadsPayload });
  } catch (error) {
    console.error("Supabase Error:", error);
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

    let body: { name?: string; is_private?: boolean };
    try {
      body = (await request.json()) as { name?: string; is_private?: boolean };
    } catch (error) {
      console.error("Supabase Error:", error);
      return errorResponse("Corps JSON invalide", 400);
    }
    const { name, is_private = true } = body;

    if (!name?.trim()) return errorResponse("Paramètres manquants", 400);
    if (name.trim().length > 30)
      return errorResponse("Nom trop long (30 car. max)", 400);

    const invite_code = is_private ? generateCode() : null;

    const { data: squad, error: squadErr } = await supabase
      .from("squads")
      .insert({ name: name.trim(), is_private, invite_code, owner_id: user.id })
      .select()
      .single();

    if (squadErr ?? !squad) {
      if (squadErr) console.error("Supabase Error:", squadErr);
      return errorResponse(
        squadErr?.message ?? "Erreur lors de la création",
        500,
      );
    }

    const { error: memberErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: squad.id, user_id: user.id });

    if (memberErr) {
      console.error("Supabase Error:", memberErr);
      return errorResponse(memberErr.message, 500);
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
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
