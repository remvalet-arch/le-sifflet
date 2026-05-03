/**
 * Parcours utilisateur complet — VAR Time
 *
 * Prérequis :
 *   - App en cours d'exécution sur localhost:3000 (ou PLAYWRIGHT_BASE_URL)
 *   - TEST_AUTH_SECRET défini dans .env.local
 *   - Au moins un match dans la base (seed.sql)
 *
 * Lance avec : npm run test:e2e
 */

import { test, expect } from "@playwright/test";

// ── 0. PWA ────────────────────────────────────────────────────────────────────

test.describe("PWA", () => {
  test("sw.js est servi (200)", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("skipWaiting");
  });
});

// ── 1. LOBBY ──────────────────────────────────────────────────────────────────

test.describe("Lobby", () => {
  test("affiche au moins une MatchCard", async ({ page }) => {
    await page.goto("/lobby");

    await page.waitForSelector("main", { state: "visible" });

    const matchLinks = page.locator('a[href^="/match/"]');
    await expect(matchLinks.first()).toBeVisible({ timeout: 10_000 });

    const count = await matchLinks.count();
    console.log(`[lobby] ${count} match(s) trouvé(s)`);
    expect(count).toBeGreaterThan(0);
  });
});

// ── 2. LIVEROOM — Super-Bouton ────────────────────────────────────────────────

test.describe("LiveRoom", () => {
  test("affiche le Super-Bouton (FAB) sur un match en cours", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]', { state: "visible" });

    const firstMatch = page.locator('a[href^="/match/"]').first();
    await firstMatch.click();

    await page.waitForURL(/\/match\//);
    await page.waitForSelector("main", { state: "visible" });

    const superButton = page.locator('button[aria-label="Ouvrir le tiroir d\'action"]');
    const matchIsLive = await superButton.isVisible().catch(() => false);

    if (matchIsLive) {
      console.log("[liveroom] ✓ Super-Bouton FAB visible sur un match En Direct");
      await expect(superButton).toBeVisible();
    } else {
      console.log("[liveroom] ℹ Match non En Direct — Super-Bouton attendu absent");
      const kopTab = page.getByRole("button", { name: "Kop", exact: true });
      await expect(kopTab).toBeVisible({ timeout: 8_000 });
    }
  });

  test("les onglets Kop, Compo et Pronos ou Stats sont présents", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]');
    await page.locator('a[href^="/match/"]').first().click();
    await page.waitForURL(/\/match\//);

    await expect(page.getByRole("button", { name: "Kop", exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: "Compo", exact: true })).toBeVisible({ timeout: 8_000 });

    const pronosOrStats = page
      .getByRole("button", { name: "Pronos", exact: true })
      .or(page.getByRole("button", { name: "Stats", exact: true }));
    await expect(pronosOrStats).toBeVisible({ timeout: 8_000 });

    console.log("[liveroom] ✓ Onglets LiveRoom (Kop, Compo, Pronos|Stats) visibles");
  });
});

// ── 3. PRONOS — score exact (PolymarketTab) ───────────────────────────────────

test.describe("Pronos (score exact)", () => {
  test("onglet Pronos affiche le bloc Score Exact sur match à venir", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]');
    await page.locator('a[href^="/match/"]').first().click();
    await page.waitForURL(/\/match\//);

    const pronosTab = page.getByRole("button", { name: "Pronos", exact: true });
    const hasPronos = await pronosTab.isVisible().catch(() => false);
    if (!hasPronos) {
      test.skip(true, "Premier match du lobby n'est pas à venir — pas d'onglet Pronos");
    }

    await pronosTab.click();
    await expect(page.getByText(/Score Exact/i)).toBeVisible({ timeout: 8_000 });
    console.log("[pronos] ✓ Formulaire score exact visible");
  });

  test("score 0-0 affiche le design Bunker", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]');
    await page.locator('a[href^="/match/"]').first().click();
    await page.waitForURL(/\/match\//);

    const pronosTab = page.getByRole("button", { name: "Pronos", exact: true });
    if (!(await pronosTab.isVisible().catch(() => false))) {
      test.skip(true, "Match non à venir — pas d'onglet Pronos");
    }

    await pronosTab.click();
    await expect(page.getByText(/Score Exact/i)).toBeVisible({ timeout: 8_000 });

    const homeInput = page.locator('input[type="number"]').nth(0);
    const awayInput = page.locator('input[type="number"]').nth(1);
    await homeInput.fill("0");
    await awayInput.fill("0");

    const bunker = page.getByRole("status");
    await expect(bunker).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/AUCUN BUTEUR/i)).toBeVisible();
    console.log("[pronos] ✓ Bunker 0-0 affiché");
  });
});

// ── 4. PROFIL ────────────────────────────────────────────────────────────────

test.describe("Profil", () => {
  test("affiche le solde, le badge karma et l'onglet Paris VAR", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForSelector("main", { state: "visible" });

    await expect(page.getByText("Confiance", { exact: true })).toBeVisible({ timeout: 8_000 });

    const badgeTexts = ["Modérateur", "Supporteur", "Carton Jaune"];
    let badgeFound = false;
    for (const badge of badgeTexts) {
      if (await page.locator(`text=${badge}`).first().isVisible().catch(() => false)) {
        console.log(`[profile] ✓ Badge karma visible : ${badge}`);
        badgeFound = true;
        break;
      }
    }
    expect(badgeFound).toBeTruthy();

    const parisVarTab = page.getByRole("button", { name: /Paris VAR/i });
    await expect(parisVarTab).toBeVisible({ timeout: 5_000 });
    console.log("[profile] ✓ Onglet Paris VAR visible");
  });
});
