import { createAdminClient } from "@/lib/supabase/admin";
import {
  LOCALE_DEFAULT_LEAGUE_IDS,
  FALLBACK_DEFAULT_LEAGUE_IDS,
} from "@/lib/constants/competitions";

/**
 * Returns competition UUIDs matching the user's locale.
 * Queries DB to resolve api_football_league_id → UUID.
 */
export async function getDefaultCompetitionsByLocale(
  acceptLanguage: string | null,
): Promise<string[]> {
  const locale = parseLocale(acceptLanguage);
  const apiIds =
    LOCALE_DEFAULT_LEAGUE_IDS[locale] ?? FALLBACK_DEFAULT_LEAGUE_IDS;

  const admin = createAdminClient();
  const { data } = await admin
    .from("competitions")
    .select("id")
    .in("api_football_league_id", apiIds);

  return (data ?? []).map((c) => c.id);
}

function parseLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "fr";
  // Accept-Language: "fr-FR,fr;q=0.9,en;q=0.8" → "fr"
  const first = acceptLanguage.split(",")[0]?.split(";")[0]?.trim() ?? "";
  return (first.split("-")[0] ?? "fr").toLowerCase();
}
