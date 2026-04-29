import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveEvent(
  eventId: string,
  result: "oui" | "non",
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("resolve_event", {
    p_event_id: eventId,
    p_result: result,
  });
  if (error) throw new Error(error.message);
}
