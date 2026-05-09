/**
 * Playwright global setup.
 * Crée l'utilisateur de test (s'il n'existe pas) et génère une session authentifiée
 * via magic link Supabase → sauvegardée dans tests/e2e/.auth/user.json.
 */

import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as path from "path";

loadEnv({ path: ".env.local" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TEST_USER_EMAIL =
  process.env.TEST_USER_EMAIL ?? "e2e-player@le-sifflet.test";
const TEST_USER_PASSWORD =
  process.env.TEST_USER_PASSWORD ?? "S1fflet-E2E-2026!";
const TEST_AUTH_SECRET = process.env.TEST_AUTH_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AUTH_FILE = path.join(__dirname, ".auth", "user.json");

async function ensureTestUser() {
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: WebSocket as any },
  });

  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = users.find((u) => u.email === TEST_USER_EMAIL);

  if (existing) {
    console.log(
      `[setup] Utilisateur E2E existant : ${existing.id.slice(0, 8)}…`,
    );
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });
  if (error)
    throw new Error(`Impossible de créer l'utilisateur E2E : ${error.message}`);

  // Attendre le trigger handle_new_user
  await new Promise((r) => setTimeout(r, 500));

  await admin
    .from("profiles")
    .update({ username: "E2EJoueur", sifflets_balance: 1000 })
    .eq("id", data.user.id);

  console.log(`[setup] Utilisateur E2E créé : ${data.user.id.slice(0, 8)}…`);
}

export default async function globalSetup(_config: FullConfig) {
  if (!TEST_AUTH_SECRET) {
    throw new Error(
      "TEST_AUTH_SECRET manquant dans .env.local — requis pour les tests E2E.",
    );
  }

  await ensureTestUser();

  // Signe l'utilisateur via /api/test/session (signInWithPassword server-side)
  // → évite le flow magic-link qui nécessite que localhost soit whitelisté
  //   dans les redirect URLs du dashboard Supabase.
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const sessionUrl =
    `${BASE_URL}/api/test/session` +
    `?email=${encodeURIComponent(TEST_USER_EMAIL)}` +
    `&password=${encodeURIComponent(TEST_USER_PASSWORD)}` +
    `&secret=${encodeURIComponent(TEST_AUTH_SECRET)}`;

  console.log("[setup] Connexion via /api/test/session…");
  await page.goto(sessionUrl, { waitUntil: "networkidle" });

  await page.waitForURL(`${BASE_URL}/lobby`, { timeout: 15_000 }).catch(() => {
    console.warn(
      "[setup] Redirection /lobby non détectée — on continue quand même.",
    );
  });

  // Marquer l'onboarding comme complété pour éviter que le modal OnboardingTour
  // n'apparaisse dans chaque test et intercepte les clics.
  await page.evaluate(() => {
    localStorage.setItem("hasCompletedOnboarding", "true");
  });

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  console.log(`[setup] Storage state sauvegardé → ${AUTH_FILE}`);

  await browser.close();
}
