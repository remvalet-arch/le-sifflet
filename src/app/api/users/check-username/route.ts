import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { USERNAME_RE, isReservedUsername } from "@/lib/username";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Corps invalide", 400);
  }

  const { username } = body as { username?: string };

  if (!username || typeof username !== "string") {
    return successResponse({
      available: false,
      valid: false,
      message: "Pseudo requis",
    });
  }

  if (!USERNAME_RE.test(username)) {
    return successResponse({
      available: false,
      valid: false,
      message: "3-20 caractères : lettres, chiffres, _ ou -",
    });
  }

  if (isReservedUsername(username)) {
    return successResponse({
      available: false,
      valid: false,
      message: "Ce pseudo est réservé",
    });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  return successResponse({ available: !existing, valid: true });
}
