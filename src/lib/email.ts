import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailPayload) {
  const { error } = await resend.emails.send({
    from: "VAR TIME <no-reply@vartime.app>",
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(error.message);
  }
}

export function emailWelcome(username: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Header -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:28px;font-weight:900;color:#f0f0e8;letter-spacing:-1px;">⚽ VAR TIME</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#141a14;border-radius:16px;padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#f0f0e8;">Bienvenue ${username} ! 🎉</p>
          <p style="margin:0 0 24px;font-size:15px;color:#a0a090;line-height:1.6;">Tu viens de rejoindre les arbitres du peuple. C'est toi qui décides si c'est penalty ou non.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:0 0 12px;">
              <a href="https://vartime.app/pronos" style="display:block;background:#d4a017;color:#0a0f0a;text-align:center;padding:14px 20px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;">🏆 Fais ton premier prono</a>
            </td></tr>
            <tr><td style="padding:0 0 12px;">
              <a href="https://vartime.app/lobby" style="display:block;background:#1e2a1e;color:#f0f0e8;text-align:center;padding:14px 20px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);">⚽ Rejoins la salle de match</a>
            </td></tr>
            <tr><td>
              <a href="https://vartime.app/settings/notifications" style="display:block;background:#1e2a1e;color:#f0f0e8;text-align:center;padding:14px 20px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);">🔔 Active les alertes match</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#606060;line-height:1.6;">L'appli est encore en bêta — tes retours comptent énormément. Réponds directement à cet email si tu as une idée ou un bug à signaler.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#404040;">VAR TIME · <a href="https://vartime.app" style="color:#606060;">vartime.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailJ3Inactive(username: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:28px;font-weight:900;color:#f0f0e8;letter-spacing:-1px;">⚽ VAR TIME</span>
        </td></tr>
        <tr><td style="background:#141a14;border-radius:16px;padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#f0f0e8;">${username}, on a réservé ta place 🏆</p>
          <p style="margin:0 0 24px;font-size:15px;color:#a0a090;line-height:1.6;">La Ligue Bêta CDM 2026 se remplit vite. Les bêta-testeurs qui participent maintenant auront un badge exclusif « Fondateur » avant la Coupe du Monde.</p>

          <a href="https://vartime.app/lobby" style="display:block;background:#d4a017;color:#0a0f0a;text-align:center;padding:14px 20px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:24px;">⚡ Rejoindre la ligue CDM</a>

          <p style="margin:0;font-size:13px;color:#606060;line-height:1.6;">Tu peux désactiver ces emails dans tes <a href="https://vartime.app/settings/notifications" style="color:#808070;">préférences de notification</a>.</p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#404040;">VAR TIME · <a href="https://vartime.app" style="color:#606060;">vartime.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailJ7Churn(username: string, tallyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:28px;font-weight:900;color:#f0f0e8;letter-spacing:-1px;">⚽ VAR TIME</span>
        </td></tr>
        <tr><td style="background:#141a14;border-radius:16px;padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#f0f0e8;">${username}, une dernière chose 🙏</p>
          <p style="margin:0 0 24px;font-size:15px;color:#a0a090;line-height:1.6;">On a vu que VAR TIME n'a pas encore déclenché ton intérêt. Avant que tu partes, une seule question (30 secondes) — ça nous aide vraiment à améliorer l'appli.</p>

          <a href="${tallyUrl}" style="display:block;background:#d4a017;color:#0a0f0a;text-align:center;padding:14px 20px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:24px;">💬 Dire ce qui m'a freiné</a>

          <p style="margin:0;font-size:13px;color:#606060;line-height:1.6;">Ou si tu veux réessayer : <a href="https://vartime.app" style="color:#808070;">vartime.app</a></p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#404040;">VAR TIME · <a href="https://vartime.app" style="color:#606060;">vartime.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
