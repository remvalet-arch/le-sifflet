import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail, emailWelcome } from "@/lib/email";

export const dynamic = "force-dynamic";

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("x-webhook-secret")?.trim() ?? "";
  if (!header) return false;
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: { id: string; username: string } | null;
};

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) return errorResponse("Non autorisé", 401);

  let body: WebhookPayload;
  try {
    body = (await request.json()) as WebhookPayload;
  } catch {
    return errorResponse("Payload invalide", 400);
  }

  if (body.type !== "INSERT" || !body.record) {
    return successResponse({ skipped: true });
  }

  const { id, username } = body.record;

  const admin = createAdminClient();
  const { data: authUser, error } = await admin.auth.admin.getUserById(id);
  if (error || !authUser.user?.email) {
    console.error("[webhook/new-profile] Cannot resolve email for", id, error);
    return successResponse({ sent: false, reason: "no_email" });
  }

  try {
    await sendEmail({
      to: authUser.user.email,
      subject: "Bienvenue sur VAR TIME ⚽ — C'est toi l'arbitre !",
      html: emailWelcome(username),
    });
    console.info("[webhook/new-profile] Welcome email sent to", authUser.user.email);
  } catch (err) {
    console.error("[webhook/new-profile] Email send failed:", err);
    return successResponse({ sent: false, reason: "resend_error" });
  }

  return successResponse({ sent: true });
}
