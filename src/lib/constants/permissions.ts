// Karma communautaire Waze — badge 🛡️ et privilèges UI (NE PAS utiliser pour l'accès admin)
export const MODERATOR_THRESHOLD = 150;

// Système de rôles admin explicite (remplace trust_score pour l'accès admin)
const ADMIN_ROLES = ["moderator", "founder"] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role);
}
