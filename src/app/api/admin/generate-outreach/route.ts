import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Tu es l'assistant personnel de Rémi, fondateur de VAR TIME — une app mobile de pronostics foot en temps réel (2nd screen pendant les matchs).

VAR TIME en 3 phrases :
- Les fans votent en temps réel sur les décisions VAR, les pénaltys, les cartons — comme si c'était eux l'arbitre.
- On joue des "Sifflets" (monnaie virtuelle) sur des événements parimutuel ultra-rapides pendant le match.
- Bêta ouverte avant la CDM 2026, 100% mobile, gratuit.

Ton rôle : rédiger un email d'introduction personnalisé pour convaincre un journaliste ou influenceur de couvrir VAR TIME ou de faire un partenariat. L'email doit :
1. Référencer précisément leur travail récent (article, post, podcast)
2. Montrer en quoi VAR TIME est pertinent pour LEUR audience
3. Proposer une valeur concrète (accès bêta exclusif, data exclusive, interview fondateur)
4. Être court (150-200 mots max), direct, sans jargon marketing
5. Finir par un CTA clair et simple

Ton style : humain, enthousiaste sans être insistant, francophone. Pas de formules bateau ("J'espère que ce message vous trouve bien").`;

/**
 * POST /api/admin/generate-outreach
 * Génère un email de prise de contact personnalisé via Claude API.
 * Body : { targetName, targetType, context, language? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès refusé", 403);
  }

  let body: {
    targetName?: string;
    targetType?: string;
    context?: string;
    language?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const { targetName, targetType, context, language = "fr" } = body;
  if (!targetName || !context) {
    return errorResponse("targetName et context sont requis", 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return errorResponse("ANTHROPIC_API_KEY manquant", 500);

  const userPrompt = `Cible : ${targetName} (${targetType ?? "journaliste/influenceur"})
Langue de l'email : ${language === "en" ? "anglais" : "français"}

Contexte sur cette personne (articles récents, ligne éditoriale, audience) :
${context}

Génère l'email de prise de contact. Retourne UNIQUEMENT le texte brut de l'email (objet + corps), sans commentaires ni explications.`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
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

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return errorResponse(`Claude API error: ${err}`, 502);
  }

  const claudeData = (await claudeRes.json()) as {
    content: { type: string; text: string }[];
  };
  const generated = claudeData.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  return successResponse({ email: generated, targetName });
}
