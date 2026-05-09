import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const SYSTEM_MSG_RATE_LIMIT = 5;

async function canPost(
  admin: ReturnType<typeof createAdminClient>,
  squadId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("squad_messages")
    .select("id", { count: "exact", head: true })
    .eq("squad_id", squadId)
    .eq("is_system_message", true)
    .gte("created_at", since);
  return (count ?? 0) < SYSTEM_MSG_RATE_LIMIT;
}

export async function postSquadSystemMessage(
  squadId: string,
  content: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!(await canPost(admin, squadId))) return;
  const { error } = await admin.from("squad_messages").insert({
    squad_id: squadId,
    user_id: null,
    content,
    is_system_message: true,
  });
  if (error) {
    log.error("squad-messages", "postSquadSystemMessage", error.message);
  }
}

/** Post a system message to every squad a set of users belongs to.
 *  Posts at most one message per squad (for the "best" user if multiple qualify).
 *  Picks the user with the highest `score` among those in the squad.
 */
export async function postSystemMessageToUserSquads(
  userScores: Map<string, { score: number; message: string }>,
): Promise<void> {
  if (userScores.size === 0) return;
  const admin = createAdminClient();
  const userIds = [...userScores.keys()];

  const { data: memberships } = await admin
    .from("squad_members")
    .select("user_id, squad_id")
    .in("user_id", userIds);

  if (!memberships?.length) return;

  // Pick best user per squad
  const squadBest = new Map<string, { score: number; message: string }>();
  for (const m of memberships) {
    const entry = userScores.get(m.user_id);
    if (!entry) continue;
    const current = squadBest.get(m.squad_id);
    if (!current || entry.score > current.score) {
      squadBest.set(m.squad_id, entry);
    }
  }

  await Promise.all(
    [...squadBest.entries()].map(([squadId, { message }]) =>
      postSquadSystemMessage(squadId, message),
    ),
  );
}
