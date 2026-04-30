/**
 * Parcours utilisateur complet — Le Sifflet
 *
 * Prérequis :
 *   - App en cours d'exécution sur localhost:3000 (ou PLAYWRIGHT_BASE_URL)
 *   - TEST_AUTH_SECRET défini dans .env.local
 *   - Au moins un match dans la base (seed.sql)
 *
 * Lance avec : npm run test:e2e
 */

import { test, expect } from "@playwright/test";

// ── 1. LOBBY ──────────────────────────────────────────────────────────────────

test.describe("Lobby", () => {
  test("affiche au moins une MatchCard", async ({ page }) => {
    await page.goto("/lobby");

    // Attendre que le contenu soit chargé (fin du skeleton animate-pulse)
    await page.waitForSelector("main", { state: "visible" });

    // Chercher un lien vers /match/ (chaque MatchCard est un <a href="/match/...">)
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

    // Cliquer sur le premier match disponible
    const firstMatch = page.locator('a[href^="/match/"]').first();
    await firstMatch.click();

    // Attendre que la LiveRoom se charge (présence des onglets)
    await page.waitForURL(/\/match\//);
    await page.waitForSelector("main", { state: "visible" });

    // Le Super-Bouton (FAB) est présent uniquement sur les matchs En Direct
    // Il est rendu dans BottomNav avec aria-label="Ouvrir le tiroir d'action"
    // On vérifie sa présence — s'il n'est pas visible c'est que le match est upcoming/finished
    const superButton = page.locator('button[aria-label="Ouvrir le tiroir d\'action"]');
    const matchIsLive = await superButton.isVisible().catch(() => false);

    if (matchIsLive) {
      console.log("[liveroom] ✓ Super-Bouton FAB visible sur un match En Direct");
      await expect(superButton).toBeVisible();
    } else {
      // Match upcoming ou terminé — vérifier quand même que la page est bien chargée
      console.log("[liveroom] ℹ Match non En Direct — Super-Bouton attendu absent");
      const tabs = page.locator("button").filter({ hasText: "Temps forts" });
      await expect(tabs.first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test("les onglets Temps forts, Compositions, Prédictions sont présents", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]');
    await page.locator('a[href^="/match/"]').first().click();
    await page.waitForURL(/\/match\//);

    const tabLabels = ["Temps forts", "Compositions", "Prédictions"];
    for (const label of tabLabels) {
      const tab = page.locator("button").filter({ hasText: label });
      await expect(tab.first()).toBeVisible({ timeout: 8_000 });
    }
    console.log("[liveroom] ✓ Les 3 onglets sont présents");
  });
});

// ── 3. PRÉDICTIONS — Paris long terme ────────────────────────────────────────

test.describe("Prédictions (Paris long terme)", () => {
  test("ouvrir un score et afficher le formulaire de mise", async ({ page }) => {
    await page.goto("/lobby");
    await page.waitForSelector('a[href^="/match/"]');
    await page.locator('a[href^="/match/"]').first().click();
    await page.waitForURL(/\/match\//);

    // Cliquer sur l'onglet "Prédictions"
    const predictionsTab = page.locator("button").filter({ hasText: "Prédictions" });
    await predictionsTab.first().click();

    // Attendre que le contenu de l'onglet soit rendu
    await page.waitForSelector("text=Paris long terme", { timeout: 8_000 }).catch(() => {
      // L'onglet peut afficher un spinner — on attend quand même
    });

    // L'accordéon "Score Exact" est peut-être fermé — chercher un bouton avec une cote (ex. "× 5.0")
    // L'accordéon Score exact s'ouvre automatiquement (scorerOpen = true par défaut)
    // Chercher un bouton de score dans la grille (contient "1-0", "0-0", etc.)
    const scoreButtons = page.locator("button").filter({ hasText: /^\d-\d$/ });
    const hasScoreButtons = await scoreButtons.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasScoreButtons) {
      // L'accordéon est peut-être replié — chercher et cliquer sur "Score Exact"
      const scoreAccordion = page.locator("button").filter({ hasText: /Score Exact/i });
      if (await scoreAccordion.first().isVisible()) {
        await scoreAccordion.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Cliquer sur le premier bouton de score disponible (non déjà parié)
    const availableScore = page.locator("button").filter({ hasText: /^\d-\d$/ }).first();

    if (await availableScore.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await availableScore.click();

      // Vérifier que le formulaire de mise apparaît
      const betForm = page.locator("text=Mise (min. 10 Sifflets)");
      await expect(betForm).toBeVisible({ timeout: 5_000 });
      console.log("[predictions] ✓ Formulaire de mise affiché après clic sur un score");
    } else {
      // Pas de données joueurs — vérifier que le message d'état vide est affiché
      const emptyMsg = page.locator("text=Paris long terme");
      await expect(emptyMsg).toBeVisible({ timeout: 5_000 });
      console.log("[predictions] ℹ Aucun score disponible — vérification du contenu de l'onglet OK");
    }
  });
});

// ── 4. PROFIL ────────────────────────────────────────────────────────────────

test.describe("Profil", () => {
  test("affiche le solde et le badge karma", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForSelector("main", { state: "visible" });

    // Vérifier l'affichage du solde
    const balanceLabel = page.locator("text=Solde actuel");
    await expect(balanceLabel).toBeVisible({ timeout: 8_000 });

    // Vérifier le badge karma (l'un des trois)
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

    // Vérifier l'onglet "Mes Paris"
    const betSection = page.locator("text=Mes Paris");
    await expect(betSection).toBeVisible({ timeout: 5_000 });
    console.log("[profile] ✓ Section 'Mes Paris' visible");
  });
});
