import { createAdminClient } from "@/lib/supabase/admin";

export async function postSquadSystemMessage(
  squadId: string,
  content: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("squad_messages").insert({
    squad_id: squadId,
    user_id: null,
    content,
    is_system_message: true,
  });
  if (error) {
    console.error("[postSquadSystemMessage]", error.message);
  }
}
