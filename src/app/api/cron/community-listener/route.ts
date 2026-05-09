import { timingSafeEqual } from "node:crypto";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail } from "@/lib/email";
import { searchRecentTweets, type TwitterTweet } from "@/lib/twitter";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SEARCH_QUERIES = [
  '"VAR TIME" OR "vartime.app"',
  "#PariVAR",
  '"pronos foot" app',
];

const SYSTEM_PROMPT = `Tu es l'assistant veille sociale de VAR TIME, une app de paris foot en temps réel.
Tu analyses des tweets pour détecter les opportunités marketing et les feedbacks utilisateurs.

Pour chaque tweet, classe-le en une seule catégorie :
- MENTION_POSITIVE : parle bien de VAR TIME ou du concept
- MENTION_NEGATIVE : critique VAR TIME ou le concept
- OPPORTUNITE : utilisateur qui cherche une app comme VAR TIME, ou parle de VAR/pronos foot
- IRRELEVANT : hors-sujet, spam, ou sans intérêt

Réponds en JSON uniquement : { "classifications": [{ "id": "...", "category": "...", "note": "..." }] }
"note" = 1 phrase sur pourquoi tu as choisi cette catégorie.`;

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

function emailCommunityListener(
  date: string,
  classified: Array<{
    tweet: TwitterTweet;
    category: string;
    note: string;
  }>,
): string {
  const priority = classified.filter((c) =>
    ["MENTION_POSITIVE", "MENTION_NEGATIVE", "OPPORTUNITE"].includes(
      c.category,
    ),
  );

  const categoryEmoji: Record<string, string> = {
    MENTION_POSITIVE: "✅",
    MENTION_NEGATIVE: "⚠️",
    OPPORTUNITE: "🎯",
    IRRELEVANT: "—",
  };

  const rows = priority
    .map(
      (c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#a0b0a0;">${categoryEmoji[c.category]} ${c.category}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#f0f0e8;">
        <strong>@${c.tweet.author?.username ?? "?"}</strong><br>
        ${c.tweet.text.slice(0, 200)}${c.tweet.text.length > 200 ? "…" : ""}
        <br><em style="color:#606860;font-size:11px;">${c.note}</em>
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding-bottom:20px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#f0f0e8;">📡 VAR TIME — Veille Twitter</span>
          <p style="margin:4px 0 0;font-size:13px;color:#606860;">${date}</p>
        </td></tr>
        <tr><td style="background:#141a14;border-radius:16px;padding:24px;">
          ${
            priority.length === 0
              ? `<p style="color:#606860;font-size:14px;text-align:center;">Aucune mention pertinente aujourd'hui. Calme plat.</p>`
              : `
          <p style="margin:0 0 16px;font-size:13px;color:#a0b0a0;">${priority.length} mention(s) pertinente(s) sur ${classified.length} analysée(s)</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#606860;border-bottom:1px solid #1e2a1e;">CATÉGORIE</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#606860;border-bottom:1px solid #1e2a1e;">TWEET</th>
            </tr>
            ${rows}
          </table>`
          }
        </td></tr>
        <tr><td style="padding:16px 0 0;text-align:center;font-size:11px;color:#404840;">
          Réponse manuelle recommandée pour les MENTION_NEGATIVE et OPPORTUNITE · @VARTimeLive
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL ?? "rem.valet@gmail.com";

  // Collect tweets from all queries
  const allTweets: TwitterTweet[] = [];
  for (const query of SEARCH_QUERIES) {
    try {
      const tweets = await searchRecentTweets(query, 10);
      allTweets.push(...tweets);
    } catch (err) {
      log.error("cron-community-listener", "Twitter search error", {
        query,
        error: String(err),
      });
    }
  }

  // Deduplicate by tweet ID
  const seenIds = new Set<string>();
  const uniqueTweets = allTweets.filter((t) => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  if (uniqueTweets.length === 0) {
    return successResponse({ analyzed: 0, priority: 0 });
  }

  type Classification = { id: string; category: string; note: string };
  let classifications: Classification[] = [];

  if (apiKey) {
    try {
      const userPrompt = uniqueTweets
        .map(
          (t) =>
            `ID: ${t.id}\nAuteur: @${t.author?.username ?? "?"}\n${t.text}`,
        )
        .join("\n---\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          content: { type: string; text: string }[];
        };
        const text = data.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
        const clean = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(clean) as {
          classifications: Classification[];
        };
        classifications = parsed.classifications;
      }
    } catch (err) {
      log.error("cron-community-listener", "Claude API error", {
        error: String(err),
      });
    }
  }

  // Merge classifications with tweet data
  const classMap = new Map(classifications.map((c) => [c.id, c]));
  const enriched = uniqueTweets.map((t) => ({
    tweet: t,
    category: classMap.get(t.id)?.category ?? "IRRELEVANT",
    note: classMap.get(t.id)?.note ?? "",
  }));

  const priority = enriched.filter((c) => c.category !== "IRRELEVANT").length;

  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  try {
    await sendEmail({
      to: adminEmail,
      subject: `📡 Veille Twitter VAR TIME — ${priority} mention(s) — ${date}`,
      html: emailCommunityListener(date, enriched),
    });
  } catch (err) {
    log.error("cron-community-listener", "sendEmail failed", {
      error: String(err),
    });
  }

  return successResponse({ analyzed: uniqueTweets.length, priority });
}
