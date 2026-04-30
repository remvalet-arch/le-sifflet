/**
 * simulate-match-scenario.ts
 *
 * Script de simulation du moteur de résolution des paris long terme.
 * Lance avec : npm run test:backend
 *
 * Scénario :
 *   Joueur A parie sur le buteur "Mbappé" (×3.5, mise 100)  → doit GAGNER (but en timeline)
 *   Joueur B parie sur le score exact "0-0"  (×8.0, mise 100) → doit PERDRE (score final 2-1)
 *
 * Solde attendu après résolution :
 *   Joueur A : 1000 - 100 + 350 = 1250  ✓
 *   Joueur B : 1000 - 100       =  900  ✓
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

config({ path: ".env.local" });

// ── Couleurs console ──────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};
const ok    = (msg: string) => console.log(`${C.green}${C.bold}  ✓ PASS${C.reset}  ${msg}`);
const fail  = (msg: string) => { console.log(`${C.red}${C.bold}  ✗ FAIL${C.reset}  ${msg}`); FAILURES++; };
const info  = (msg: string) => console.log(`${C.cyan}  ▸${C.reset}  ${msg}`);
const warn  = (msg: string) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`);
const title = (msg: string) => console.log(`\n${C.bold}${C.cyan}══ ${msg} ══${C.reset}`);

let FAILURES = 0;

// ── Client admin ─────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(`${C.red}ERREUR : Variables d'environnement manquantes. Lance depuis la racine du projet avec .env.local.${C.reset}`);
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Config test ───────────────────────────────────────────────────────────────

const TEST_EMAILS = {
  moderator: "sim-moderator@le-sifflet.test",
  playerA:   "sim-player-a@le-sifflet.test",
  playerB:   "sim-player-b@le-sifflet.test",
};
const TEST_PASSWORD = "S1fflet-Test-2026!";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findOrCreateUser(email: string, username: string) {
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  const existing = users.find((u) => u.email === email);
  if (existing) {
    info(`Utilisateur existant réutilisé : ${username} (${existing.id.slice(0, 8)}…)`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  info(`Utilisateur créé : ${username} (${data.user.id.slice(0, 8)}…)`);
  return data.user.id;
}

async function resetProfile(userId: string, username: string, trustScore: number) {
  // Le trigger handle_new_user crée automatiquement le profil — on attend qu'il soit là.
  await new Promise((r) => setTimeout(r, 300));

  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: userId, username, sifflets_balance: 1000, trust_score: trustScore },
      { onConflict: "id" },
    );
  if (error) throw new Error(`resetProfile ${username}: ${error.message}`);
}

async function cleanupTestData(matchId: string | null, userIds: string[]) {
  if (matchId) {
    await admin.from("match_timeline_events").delete().eq("match_id", matchId);
    await admin.from("long_term_bets").delete().eq("match_id", matchId);
    await admin.from("matches").delete().eq("id", matchId);
  }
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

// ── Scénario principal ────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${C.bold}Le Sifflet — Simulation du moteur de résolution${C.reset}`);
  console.log(`${C.gray}Supabase : ${SUPABASE_URL}${C.reset}\n`);

  const userIds: string[] = [];
  let matchId: string | null = null;

  try {
    // ── 1. Setup : utilisateurs ──────────────────────────────────────────────
    title("1 · SETUP — Utilisateurs");

    const modId  = await findOrCreateUser(TEST_EMAILS.moderator, "SimModérateur");
    const aId    = await findOrCreateUser(TEST_EMAILS.playerA,   "SimJoueurA");
    const bId    = await findOrCreateUser(TEST_EMAILS.playerB,   "SimJoueurB");
    userIds.push(modId, aId, bId);

    await resetProfile(modId, "SimModérateur", 200);
    await resetProfile(aId,   "SimJoueurA",    100);
    await resetProfile(bId,   "SimJoueurB",    100);

    ok("3 profils initialisés à 1000 Sifflets");

    // ── 2. Action : match + paris ────────────────────────────────────────────
    title("2 · ACTION — Match & Paris");

    const { data: match, error: matchErr } = await admin
      .from("matches")
      .insert({
        team_home:   "Paris SG",
        team_away:   "Olympique Lyonnais",
        status:      "first_half",
        home_score:  0,
        away_score:  0,
        start_time:  new Date().toISOString(),
      })
      .select("id")
      .single();
    if (matchErr || !match) throw new Error(`createMatch: ${matchErr?.message}`);
    matchId = match.id;
    info(`Match créé : PSG vs OL (${matchId.slice(0, 8)}…)`);

    // Joueur A — buteur "Mbappé" (doit gagner)
    const { error: betAErr } = await admin.from("long_term_bets").insert({
      match_id:         matchId,
      user_id:          aId,
      bet_type:         "scorer",
      bet_value:        "Mbappé",
      amount_staked:    100,
      potential_reward: 350,   // 100 × 3.5
      status:           "pending",
    });
    if (betAErr) throw new Error(`betA: ${betAErr.message}`);
    // Débit manuel (simulation du RPC place_long_term_bet)
    await admin.from("profiles").update({ sifflets_balance: 900 }).eq("id", aId);
    info("Joueur A : ⚽ Buteur Mbappé — mise 100, gain potentiel 350");

    // Joueur B — score exact "0-0" (doit perdre)
    const { error: betBErr } = await admin.from("long_term_bets").insert({
      match_id:         matchId,
      user_id:          bId,
      bet_type:         "exact_score",
      bet_value:        "0-0",
      amount_staked:    100,
      potential_reward: 800,   // 100 × 8.0
      status:           "pending",
    });
    if (betBErr) throw new Error(`betB: ${betBErr.message}`);
    await admin.from("profiles").update({ sifflets_balance: 900 }).eq("id", bId);
    info("Joueur B : 🎯 Score Exact 0-0 — mise 100, gain potentiel 800");

    ok("2 paris long terme enregistrés");

    // ── 3. Résolution : but + clôture ────────────────────────────────────────
    title("3 · RÉSOLUTION — But + Fin de match");

    // Insérer un but de Mbappé (47') et un second but (73')
    const { error: goal1Err } = await admin.from("match_timeline_events").insert({
      match_id:    matchId,
      event_type:  "goal",
      minute:      47,
      team_side:   "home",
      player_name: "Mbappé",
      is_own_goal: false,
    });
    if (goal1Err) throw new Error(`goal1: ${goal1Err.message}`);

    const { error: goal2Err } = await admin.from("match_timeline_events").insert({
      match_id:    matchId,
      event_type:  "goal",
      minute:      73,
      team_side:   "home",
      player_name: "Hakimi",
      is_own_goal: false,
    });
    if (goal2Err) throw new Error(`goal2: ${goal2Err.message}`);

    const { error: goal3Err } = await admin.from("match_timeline_events").insert({
      match_id:    matchId,
      event_type:  "goal",
      minute:      82,
      team_side:   "away",
      player_name: "Lacazette",
      is_own_goal: false,
    });
    if (goal3Err) throw new Error(`goal3: ${goal3Err.message}`);

    info("Timeline : ⚽ Mbappé 47', ⚽ Hakimi 73', ⚽ Lacazette 82'");

    // Fixer le score final 2-1
    const { error: scoreErr } = await admin
      .from("matches")
      .update({ home_score: 2, away_score: 1, status: "finished" })
      .eq("id", matchId);
    if (scoreErr) throw new Error(`updateScore: ${scoreErr.message}`);
    info("Score final : PSG 2 — 1 OL");

    // Appel RPC résolution
    const { error: rpcErr } = await admin.rpc("resolve_long_term_bets", {
      p_match_id: matchId,
    });
    if (rpcErr) throw new Error(`resolve_long_term_bets: ${rpcErr.message}`);
    info("RPC resolve_long_term_bets exécuté");

    // ── 4. Assertions ────────────────────────────────────────────────────────
    title("4 · ASSERTIONS");

    // Profil Joueur A
    const { data: profA } = await admin
      .from("profiles")
      .select("sifflets_balance")
      .eq("id", aId)
      .single();

    if (profA?.sifflets_balance === 1250) {
      ok(`Joueur A — solde : 1250 Sifflets (900 + 350) ✓`);
    } else {
      fail(`Joueur A — solde attendu 1250, reçu : ${profA?.sifflets_balance}`);
    }

    // Pari Joueur A
    const { data: betA } = await admin
      .from("long_term_bets")
      .select("status")
      .eq("user_id", aId)
      .eq("match_id", matchId)
      .single();

    if (betA?.status === "won") {
      ok("Joueur A — statut pari : 'won' ✓");
    } else {
      fail(`Joueur A — statut attendu 'won', reçu : '${betA?.status}'`);
    }

    // Profil Joueur B
    const { data: profB } = await admin
      .from("profiles")
      .select("sifflets_balance")
      .eq("id", bId)
      .single();

    if (profB?.sifflets_balance === 900) {
      ok(`Joueur B — solde : 900 Sifflets (1000 - 100, pari perdu) ✓`);
    } else {
      fail(`Joueur B — solde attendu 900, reçu : ${profB?.sifflets_balance}`);
    }

    // Pari Joueur B
    const { data: betB } = await admin
      .from("long_term_bets")
      .select("status")
      .eq("user_id", bId)
      .eq("match_id", matchId)
      .single();

    if (betB?.status === "lost") {
      ok("Joueur B — statut pari : 'lost' ✓");
    } else {
      fail(`Joueur B — statut attendu 'lost', reçu : '${betB?.status}'`);
    }

  } finally {
    // ── 5. Nettoyage ────────────────────────────────────────────────────────
    title("5 · NETTOYAGE");
    await cleanupTestData(matchId, userIds);
    info("Match et utilisateurs de test supprimés");
  }

  // ── Résultat final ───────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  if (FAILURES === 0) {
    console.log(`${C.green}${C.bold}  ✅  Tous les tests sont passés !${C.reset}\n`);
  } else {
    console.log(`${C.red}${C.bold}  ❌  ${FAILURES} test(s) ont échoué.${C.reset}\n`);
    process.exit(1);
  }
}

run().catch((err: unknown) => {
  console.error(`\n${C.red}${C.bold}ERREUR FATALE :${C.reset}`, err);
  process.exit(1);
});
