import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeInternalPath } from "@/lib/auth-redirect";
import { getDefaultCompetitionsByLocale } from "@/lib/default-competitions";

/**
 * OAuth PKCE : échange du ?code= contre une session (cookies).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const next = safeInternalPath(nextRaw, "/lobby");

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=auth_missing_code", url.origin),
    );
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/?error=auth&message=${encodeURIComponent(error.message)}`,
        url.origin,
      ),
    );
  }

  // Set default preferred_competitions for users who have none yet
  if (data.user) {
    void setDefaultCompetitionsIfEmpty(
      data.user.id,
      request.headers.get("accept-language"),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

async function setDefaultCompetitionsIfEmpty(
  userId: string,
  acceptLanguage: string | null,
) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("preferred_competitions, favorite_team_id")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const hasPrefs =
    Array.isArray(profile.preferred_competitions) &&
    profile.preferred_competitions.length > 0;

  if (hasPrefs) return;

  // Priority: club de cœur → langue → fallback
  let competitionIds: string[] = [];

  if (profile.favorite_team_id) {
    const { data: team } = await admin
      .from("teams")
      .select("competition_id")
      .eq("id", profile.favorite_team_id)
      .single();
    if (team) {
      // Add domestic league + UCL
      const { data: ucl } = await admin
        .from("competitions")
        .select("id")
        .eq("api_football_league_id", 2)
        .maybeSingle();
      competitionIds = [team.competition_id, ...(ucl ? [ucl.id] : [])];
    }
  }

  if (competitionIds.length === 0) {
    competitionIds = await getDefaultCompetitionsByLocale(acceptLanguage);
  }

  if (competitionIds.length > 0) {
    await admin
      .from("profiles")
      .update({ preferred_competitions: competitionIds })
      .eq("id", userId);
  }
}
