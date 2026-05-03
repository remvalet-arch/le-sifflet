import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// GET /api/rooms?match_id=X — room active de l'user pour ce match + membres
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const matchId = request.nextUrl.searchParams.get("match_id");
  if (!matchId) return errorResponse("match_id requis", 400);

  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return successResponse({ room: null });

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("match_id", matchId)
    .in(
      "id",
      memberships.map((m) => m.room_id),
    )
    .maybeSingle();

  if (!room) return successResponse({ room: null });

  const { data: members } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id);

  const memberIds = members?.map((m) => m.user_id) ?? [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", memberIds);

  return successResponse({
    room: {
      ...room,
      members: (profiles ?? []).map((p) => ({ user_id: p.id, username: p.username })),
    },
  });
}

// POST /api/rooms — créer une room + rejoindre automatiquement
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as {
    match_id?: string;
    name?: string;
    is_private?: boolean;
  };
  const { match_id, name, is_private = true } = body;

  if (!match_id || !name?.trim()) return errorResponse("Paramètres manquants", 400);
  if (name.trim().length > 30) return errorResponse("Nom trop long (30 car. max)", 400);

  // Vérifie que l'user n'est pas déjà dans une room pour ce match
  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  if (memberships?.length) {
    const { data: conflict } = await supabase
      .from("rooms")
      .select("id")
      .eq("match_id", match_id)
      .in(
        "id",
        memberships.map((m) => m.room_id),
      )
      .maybeSingle();
    if (conflict) return errorResponse("Tu es déjà dans une ligue pour ce match", 400);
  }

  const invite_code = is_private ? generateCode() : null;

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .insert({ match_id, name: name.trim(), is_private, invite_code, admin_id: user.id })
    .select()
    .single();

  if (roomErr ?? !room) return errorResponse("Erreur lors de la création", 500);

  const { error: memberErr } = await supabase
    .from("room_members")
    .insert({ room_id: room.id, user_id: user.id });

  if (memberErr) return errorResponse("Erreur lors de l'adhésion", 500);

  return successResponse({ room }, 201);
}
