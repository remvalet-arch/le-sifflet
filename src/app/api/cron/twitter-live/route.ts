import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { postTweet } from "@/lib/twitter";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  penalty: "un pénalty",
  offside: "un hors-jeu",
  card: "un carton",
};

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function buildEventOpenTweet(
  eventType: string,
  matchName: string,
  minute: number | null,
  matchId: string,
): string {
  const label = EVENT_TYPE_LABEL[eventType] ?? "un événement";
  const minuteStr = minute ? ` à la ${minute}'` : "";
  return (
    `🚨 La VAR vient de checker ${label} — ${matchName}${minuteStr} !\n` +
    `Sur VAR TIME, c'est toi l'arbitre. OUI ou NON ?\n` +
    `👉 vartime.app/match/${matchId}`
  );
}

function buildEventResolvedTweet(
  eventType: string,
  matchName: string,
  result: string,
  ouiPct: number,
): string {
  const label = EVENT_TYPE_LABEL[eventType] ?? "l'événement";
  const emoji = result === "OUI" ? "✅" : "❌";
  const crowd =
    result === "OUI"
      ? ouiPct >= 60
        ? "La foule avait raison"
        : "Contre-pied !"
      : ouiPct < 40
        ? "La foule avait raison"
        : "Contre-pied !";
  return (
    `${emoji} Verdict VAR : ${result} — ${label} refusé pour ${matchName}.\n` +
    `${ouiPct}% des joueurs avaient misé OUI. ${crowd}\n` +
    `⚽ vartime.app`
  );
}

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();
  const now = new Date();
  const window5m = new Date(now.getTime() - 5 * 60_000);

  // Find live matches
  const { data: liveMatches } = await admin
    .from("matches")
    .select("id, team_home, team_away, match_minute, status")
    .in("status", ["first_half", "second_half", "half_time", "paused"]);

  if (!liveMatches || liveMatches.length === 0) {
    return successResponse({ tweeted: 0, reason: "no live matches" });
  }

  const liveMatchIds = liveMatches.map((m) => m.id);
  const matchMap = new Map(liveMatches.map((m) => [m.id, m]));

  // Find recent open events not yet tweeted
  const { data: recentEvents } = await admin
    .from("market_events")
    .select("id, match_id, type, status, result, created_at")
    .in("match_id", liveMatchIds)
    .in("status", ["open", "resolved"])
    .gte("created_at", window5m.toISOString());

  if (!recentEvents || recentEvents.length === 0) {
    return successResponse({ tweeted: 0, reason: "no recent events" });
  }

  // Check which events already have a tweet
  const eventIds = recentEvents.map((e) => e.id);
  const { data: alreadyTweeted } = await admin
    .from("tweet_log")
    .select("market_event_id, tweet_type")
    .in("market_event_id", eventIds);

  const tweetedSet = new Set(
    (alreadyTweeted ?? []).map((t) => `${t.market_event_id}:${t.tweet_type}`),
  );

  let tweeted = 0;

  for (const event of recentEvents) {
    const match = matchMap.get(event.match_id);
    if (!match) continue;

    const matchName = `${match.team_home} vs ${match.team_away}`;

    // Tweet open event (once)
    if (event.status === "open" && !tweetedSet.has(`${event.id}:event_open`)) {
      try {
        const text = buildEventOpenTweet(
          event.type,
          matchName,
          match.match_minute,
          event.match_id,
        );
        const tweetId = await postTweet(text);
        await admin.from("tweet_log").insert({
          market_event_id: event.id,
          match_id: event.match_id,
          tweet_id: tweetId,
          tweet_type: "event_open",
        });
        tweeted++;
        console.info(`[twitter-live] Tweeted event_open for ${event.id}`);
      } catch (err) {
        console.error("[twitter-live] postTweet error:", err);
      }
    }

    // Tweet resolved event with result stats
    if (
      event.status === "resolved" &&
      event.result &&
      !tweetedSet.has(`${event.id}:event_resolved`)
    ) {
      try {
        // Get bet stats for OUI percentage
        const { data: bets } = await admin
          .from("bets")
          .select("chosen_option")
          .eq("event_id", event.id);

        const total = bets?.length ?? 0;
        const ouiCount = (bets ?? []).filter(
          (b) => b.chosen_option === "OUI",
        ).length;
        const ouiPct = total > 0 ? Math.round((ouiCount / total) * 100) : 50;

        const text = buildEventResolvedTweet(
          event.type,
          matchName,
          event.result,
          ouiPct,
        );
        const tweetId = await postTweet(text);
        await admin.from("tweet_log").insert({
          market_event_id: event.id,
          match_id: event.match_id,
          tweet_id: tweetId,
          tweet_type: "event_resolved",
        });
        tweeted++;
        console.info(`[twitter-live] Tweeted event_resolved for ${event.id}`);
      } catch (err) {
        console.error("[twitter-live] resolve tweet error:", err);
      }
    }
  }

  return successResponse({ tweeted });
}
