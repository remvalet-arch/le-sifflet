import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  sendEmail,
  emailWelcome,
  emailJ3Inactive,
  emailJ7Churn,
  emailDailyDigest,
  emailWeeklyRecap,
  emailSquadActivation,
} from "@/lib/email";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  "welcome",
  "j3-inactive",
  "j7-churn",
  "daily-digest",
  "weekly-recap",
  "squad-activation",
] as const;

type TemplateId = (typeof TEMPLATES)[number];

/**
 * POST /api/admin/test-email
 * Envoie un email de preview avec données fictives à l'email de l'admin connecté.
 * Body : { template: TemplateId }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score, username")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès refusé", 403);
  }

  let body: { template?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const templateId = body.template as TemplateId;
  if (!TEMPLATES.includes(templateId)) {
    return errorResponse("Template inconnu", 400);
  }

  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.getUserById(user.id);
  const email = authData.user?.email;
  if (!email) return errorResponse("Email introuvable", 400);

  const username = profile.username ?? "Arbitre";
  const today = new Date().toISOString().slice(0, 10);

  let subject: string;
  let html: string;

  switch (templateId) {
    case "welcome":
      subject = `[PREVIEW] Bienvenue sur VAR TIME !`;
      html = emailWelcome(username);
      break;

    case "j3-inactive":
      subject = `[PREVIEW] On a réservé ta place 🏆`;
      html = emailJ3Inactive(username);
      break;

    case "j7-churn":
      subject = `[PREVIEW] Une dernière chose 🙏`;
      html = emailJ7Churn(
        username,
        process.env.TALLY_FEEDBACK_URL ?? "https://tally.so/r/exemple",
      );
      break;

    case "daily-digest":
      subject = `[PREVIEW] 📊 Ton bilan du ${today}`;
      html = emailDailyDigest(
        username,
        {
          pronos_total: 6,
          pronos_correct: 4,
          var_bets_total: 3,
          var_bets_won: 2,
          points_earned: 215,
        },
        today,
      );
      break;

    case "weekly-recap":
      subject = `[PREVIEW] 📊 Ton récap de la semaine`;
      html = emailWeeklyRecap(
        username,
        {
          points_earned: 840,
          pronos_total: 22,
          pronos_correct: 15,
          var_bets_total: 9,
          var_bets_won: 6,
          active_days: 5,
        },
        "2026-05-03 → 2026-05-09",
      );
      break;

    case "squad-activation":
      subject = `[PREVIEW] 🏆 ${username}, il te manque une ligue !`;
      html = emailSquadActivation(username, [
        { id: "1", name: "Bêta CDM 2026", memberCount: 12 },
        { id: "2", name: "Fans Ligue 1", memberCount: 8 },
        { id: "3", name: "Les Arbitres du Peuple", memberCount: 5 },
      ]);
      break;
  }

  await sendEmail({ to: email, subject, html });

  return successResponse({ sent: true, to: email, template: templateId });
}
