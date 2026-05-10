import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export type AuditActionType =
  | "resolve_event"
  | "force_finish_match"
  | "sync_matches"
  | "admin_match_state_update"
  | "admin_timeline_event"
  | "import_assets"
  | "resolve_league_round"
  | "generate_outreach"
  | "sync_live"
  | "sync_apifootball_round"
  | "sync_apifootball_fixtures"
  | "sync_past_lineups"
  | "force_resolve_past_matches"
  | "map_apifootball_teams"
  | "sync_player_odds"
  | "trigger_initial_sync"
  | "sync_data"
  // futurs :
  | "ban_user"
  | "unban_user"
  | "reset_balance"
  | "edit_profile_admin";

interface AuditLogParams {
  actorUserId: string;
  actorRole: "user" | "moderator" | "founder";
  actionType: AuditActionType;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_user_id: params.actorUserId,
      actor_role: params.actorRole,
      action_type: params.actionType,
      target_resource_type: params.targetResourceType ?? null,
      target_resource_id: params.targetResourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
    if (error) {
      log.error("audit", "audit_log insert failed", { error, params });
    }
  } catch (err) {
    log.error("audit", "audit_log unexpected error", { err, params });
  }
}
