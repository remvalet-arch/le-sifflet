-- Migration 0105 : Suppression de la feature PolyMarket (long_term_bets)
-- et nettoyage des artifacts legacy.
--
-- Backup réalisé par le founder avant exécution (long_term_bets data exported).
-- Toutes les opérations sont idempotentes via IF EXISTS.

-- ── 1. RPCs liées à long_term_bets ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.place_long_term_bet(uuid, text, text, integer, numeric);
DROP FUNCTION IF EXISTS public.resolve_long_term_bets(uuid);

-- ── 2. Table long_term_bets ──────────────────────────────────────────────────
DROP TABLE IF EXISTS public.long_term_bets CASCADE;

-- ── 3. RPC legacy place_prono ────────────────────────────────────────────────
-- Remplacée par place_match_prono depuis migration 0050.
-- Vérification : seul PolymarketTab.tsx l'appelait (supprimé dans ce sprint).
DROP FUNCTION IF EXISTS public.place_prono(uuid, text, text, numeric);

-- ── 4. Nettoyage type 'scorer' orphelin sur pronos ───────────────────────────
-- ATTENTION : exécuter cette partie SEULEMENT après confirmation founder que :
--   SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer';   → retourne 0
-- Si des rows existent, les migrer d'abord vers 'scorer_allocation'.
--
-- ALTER TABLE public.pronos DROP CONSTRAINT IF EXISTS pronos_prono_type_check;
-- ALTER TABLE public.pronos ADD CONSTRAINT pronos_prono_type_check
--   CHECK (prono_type IN ('exact_score', 'scorer_allocation'));
