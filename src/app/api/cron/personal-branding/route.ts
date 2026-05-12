import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Tu es l'assistant personal branding de Rémi, fondateur solo de VAR TIME — app de paris foot en temps réel (PWA mobile, bêta ouverte CDM 2026).

Ton rôle : générer 3 propositions de tweets pour son compte personnel @remi_valet (founder building in public).

Chaque tweet doit être :
- Court (max 240 caractères)
- Authentique et humain (pas marketing)
- En français
- Sans hashtags (sauf 1 max si vraiment pertinent)

3 types de tweets à couvrir (1 par type) :
1. UPDATE PRODUIT : une info concrète sur ce qui a été fait/fixé/lancé cette semaine
2. INSIGHT DATA : une stat ou observation tirée des chiffres réels de l'app
3. RÉFLEXION PERSO : une pensée de founder sur la création, le foot, la CDM, la solitude du solo dev

Réponds en JSON : { "tweets": [{ "type": "update_produit|insight_data|reflexion", "text": "..." }] }`;

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

function emailPersonalBranding(
  date: string,
  tweets: Array<{ type: string; text: string }>,
  stats: { totalUsers: number; activeLast7d: number; betsLast24h: number },
): string {
  const typeLabel: Record<string, string> = {
    update_produit: "🔧 Update produit",
    insight_data: "📊 Insight data",
    reflexion: "💭 Réflexion perso",
  };

  const tweetBlocks = tweets
    .map(
      (t) => `
    <tr><td style="padding:16px;border-bottom:1px solid #1e2a1e;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#d4a017;text-transform:uppercase;letter-spacing:1px;">${typeLabel[t.type] ?? t.type}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#f0f0e8;line-height:1.5;">${t.text}</p>
      <p style="margin:0;font-size:11px;color:#404840;">${t.text.length} caractères</p>
    </td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:20px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#f0f0e8;">🐦 Tes tweets du jour</span>
          <p style="margin:4px 0 0;font-size:13px;color:#606860;">${date} · Choisis, modifie en 2 min, publie</p>
        </td></tr>

        <!-- Stats context -->
        <tr><td style="background:#141a14;border-radius:16px 16px 0 0;padding:16px 20px;border-bottom:1px solid #1e2a1e;">
          <p style="margin:0;font-size:12px;color:#606860;">Contexte pour t'inspirer · <strong style="color:#d4a017;">${stats.totalUsers} users</strong> · <strong style="color:#d4a017;">${stats.activeLast7d} actifs 7j</strong> · <strong style="color:#d4a017;">${stats.betsLast24h} paris VAR hier</strong></p>
        </td></tr>

        <!-- Tweet proposals -->
        <tr><td style="background:#141a14;border-radius:0 0 16px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${tweetBlocks}
          </table>
        </td></tr>

        <tr><td style="padding:16px 0 0;text-align:center;font-size:11px;color:#404840;">
          Publie depuis ton compte @remi_valet · Ne publie pas tous les 3 le même jour
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

  if (!apiKey) return errorResponse("ANTHROPIC_API_KEY manquant", 500);

  const admin = createAdminClient();
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60_000);

  // Gather app stats for context
  const [
    { count: totalUsers },
    { count: activeLast7d },
    { count: betsLast24h },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("user_daily_recaps")
      .select("user_id", { count: "exact", head: true })
      .gte("date", last7d.toISOString().slice(0, 10)),
    admin
      .from("bets")
      .select("id", { count: "exact", head: true })
      .gte("placed_at", last24h.toISOString()),
  ]);

  const stats = {
    totalUsers: totalUsers ?? 0,
    activeLast7d: activeLast7d ?? 0,
    betsLast24h: betsLast24h ?? 0,
  };

  const userPrompt = `Contexte de l'app aujourd'hui :
- Utilisateurs inscrits : ${stats.totalUsers}
- Utilisateurs actifs ces 7 derniers jours : ${stats.activeLast7d}
- Paris VAR placés dans les dernières 24h : ${stats.betsLast24h}
- Stade : bêta ouverte, J-33 avant la CDM 2026 (11 juin)
- Je suis dev solo, stack Next.js + Supabase, déploiement Vercel

Génère 3 propositions de tweets pour aujourd'hui.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) return errorResponse(`Claude error: ${await res.text()}`, 502);

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  let raw = "";
  for (const c of data.content) {
    if (c.type === "text") raw += c.text;
  }

  let tweets: Array<{ type: string; text: string }> = [];
  try {
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(clean) as { tweets: typeof tweets };
    tweets = parsed.tweets;
  } catch {
    return errorResponse(`Claude parse error: ${raw.slice(0, 200)}`, 502);
  }

  const date = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  await sendEmail({
    to: adminEmail,
    subject: `🐦 Tes 3 tweets du ${date}`,
    html: emailPersonalBranding(date, tweets, stats),
  });

  return successResponse({ generated: tweets.length });
}
