#!/usr/bin/env node
/**
 * Sprint recap email — appelé par l'orchestrateur après merge stage→main.
 * Envoie un résumé du sprint à rem.valet@gmail.com via Resend.
 *
 * Usage : npm run sprint:recap
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

// --- Charger .env.local si présent (dev local) ---
if (existsSync(".env.local")) {
  const lines = readFileSync(".env.local", "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = "rem.valet@gmail.com";
const FROM_EMAIL = "VAR TIME Dev <no-reply@vartime.app>";

if (!RESEND_API_KEY) {
  console.error("[sprint-recap] RESEND_API_KEY manquant — recap non envoyé.");
  process.exit(0); // non-bloquant
}

// --- Infos git ---
function git(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const branch = git("git rev-parse --abbrev-ref HEAD");
const lastTag = git("git describe --tags --abbrev=0 2>/dev/null") || "";
const logRange = lastTag ? `${lastTag}..HEAD` : "-10";
const commits = git(
  `git log ${logRange} --oneline --no-merges`
).split("\n").filter(Boolean);

const diffStat = git(`git diff ${lastTag || "HEAD~" + commits.length}..HEAD --stat`);
const filesChanged = (diffStat.match(/(\d+) files? changed/) || [])[1] ?? "?";
const insertions = (diffStat.match(/(\d+) insertions?/) || [])[1] ?? "0";
const deletions = (diffStat.match(/(\d+) deletions?/) || [])[1] ?? "0";

// Nom du sprint depuis SPRINT_SPEC.md si dispo
let sprintName = "Sprint";
if (existsSync("SPRINT_SPEC.md")) {
  const firstLine = readFileSync("SPRINT_SPEC.md", "utf-8").split("\n")[0] ?? "";
  const m = firstLine.match(/^#\s+(.+)/);
  if (m) sprintName = m[1].replace(/^SPRINT SPEC — /, "");
}

const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const repoUrl = "https://github.com/remvalet-arch/le-sifflet";

// --- Template HTML ---
const commitRows = commits
  .slice(0, 15)
  .map((c) => {
    const [hash, ...rest] = c.split(" ");
    return `<tr>
      <td style="padding:4px 8px;font-family:monospace;font-size:12px;color:#d4a017;white-space:nowrap;">${hash}</td>
      <td style="padding:4px 8px;font-size:13px;color:#c0c0b0;">${rest.join(" ")}</td>
    </tr>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:Inter,monospace,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <tr><td style="padding-bottom:20px;">
          <span style="font-size:13px;color:#404040;font-family:monospace;">VAR TIME · CI/CD · ${now}</span>
        </td></tr>

        <!-- Header -->
        <tr><td style="background:#141a14;border-radius:16px 16px 0 0;padding:24px 28px;border-bottom:1px solid #1e2a1e;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#d4a017;text-transform:uppercase;">Sprint fusionné sur main ✅</p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#f0f0e8;">${sprintName}</p>
        </td></tr>

        <!-- Stats -->
        <tr><td style="background:#141a14;padding:20px 28px;border-bottom:1px solid #1e2a1e;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:12px;">
                <p style="margin:0;font-size:28px;font-weight:900;color:#f0f0e8;">${commits.length}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#606060;text-transform:uppercase;letter-spacing:1px;">commits</p>
              </td>
              <td style="text-align:center;padding:12px;border-left:1px solid #1e2a1e;">
                <p style="margin:0;font-size:28px;font-weight:900;color:#f0f0e8;">${filesChanged}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#606060;text-transform:uppercase;letter-spacing:1px;">fichiers</p>
              </td>
              <td style="text-align:center;padding:12px;border-left:1px solid #1e2a1e;">
                <p style="margin:0;font-size:20px;font-weight:900;color:#4ade80;">+${insertions}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#606060;text-transform:uppercase;letter-spacing:1px;">insertions</p>
              </td>
              <td style="text-align:center;padding:12px;border-left:1px solid #1e2a1e;">
                <p style="margin:0;font-size:20px;font-weight:900;color:#f87171;">-${deletions}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#606060;text-transform:uppercase;letter-spacing:1px;">suppressions</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Commits -->
        <tr><td style="background:#141a14;padding:20px 28px;border-bottom:1px solid #1e2a1e;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#606060;text-transform:uppercase;">Commits</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${commitRows}
          </table>
          ${commits.length > 15 ? `<p style="margin:8px 0 0;font-size:12px;color:#404040;">… et ${commits.length - 15} autres</p>` : ""}
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#141a14;border-radius:0 0 16px 16px;padding:20px 28px;">
          <a href="${repoUrl}/commits/main" style="display:inline-block;background:#d4a017;color:#0a0f0a;padding:10px 20px;border-radius:8px;font-weight:900;font-size:13px;text-decoration:none;">Voir sur GitHub →</a>
        </td></tr>

        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#303030;">VAR TIME Dev Pipeline · branche fusionnée : <code style="color:#505050;">${branch}</code> → <code style="color:#505050;">main</code></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// --- Envoi Resend ---
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `✅ ${sprintName} — fusionné sur main (${commits.length} commits)`,
    html,
  }),
});

if (res.ok) {
  console.info(`[sprint-recap] Email envoyé à ${TO_EMAIL}`);
} else {
  const err = await res.text();
  console.error("[sprint-recap] Erreur Resend:", err);
}
