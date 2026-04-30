-- Migration 0021 : Incrément atomique du score + résolution des paris long terme

-- ── 1. increment_match_score ─────────────────────────────────────────────────
-- Appelée depuis /api/timeline-event après chaque goal inséré.
-- p_home_delta / p_away_delta valent 1 ou 0.
CREATE OR REPLACE FUNCTION public.increment_match_score(
  p_match_id   uuid,
  p_home_delta integer,
  p_away_delta integer
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.matches
  SET
    home_score = home_score + p_home_delta,
    away_score = away_score + p_away_delta
  WHERE id = p_match_id;
$$;

-- ── 2. resolve_long_term_bets ────────────────────────────────────────────────
-- Appelée depuis /api/admin/finish-match après passage du match en 'finished'.
-- Lit le score final + la timeline des buts → paie les gagnants, clôt les perdants.
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire (service_role),
-- bypass RLS pour pouvoir écrire sur profiles et long_term_bets.
CREATE OR REPLACE FUNCTION public.resolve_long_term_bets(
  p_match_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_home_score  integer;
  v_away_score  integer;
  v_final_score text;
BEGIN
  -- Verrouille la ligne match pour éviter une double résolution concurrente
  SELECT home_score, away_score
  INTO v_home_score, v_away_score
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  v_final_score := v_home_score::text || '-' || v_away_score::text;

  -- ── SCORE EXACT ────────────────────────────────────────────────────────────

  -- Crédit des gagnants
  UPDATE public.profiles p
  SET sifflets_balance = sifflets_balance + ltb.potential_reward
  FROM public.long_term_bets ltb
  WHERE ltb.match_id  = p_match_id
    AND ltb.bet_type  = 'exact_score'
    AND ltb.status    = 'pending'
    AND ltb.bet_value = v_final_score
    AND p.id          = ltb.user_id;

  -- Marquer gagnants
  UPDATE public.long_term_bets
  SET status = 'won'
  WHERE match_id  = p_match_id
    AND bet_type  = 'exact_score'
    AND status    = 'pending'
    AND bet_value = v_final_score;

  -- Marquer perdants
  UPDATE public.long_term_bets
  SET status = 'lost'
  WHERE match_id = p_match_id
    AND bet_type = 'exact_score'
    AND status   = 'pending';

  -- ── BUTEUR ─────────────────────────────────────────────────────────────────
  -- Seuls les buts NON contre-son-camp comptent pour les paris "buteur".

  -- Crédit des gagnants
  UPDATE public.profiles p
  SET sifflets_balance = sifflets_balance + ltb.potential_reward
  FROM public.long_term_bets ltb
  WHERE ltb.match_id = p_match_id
    AND ltb.bet_type = 'scorer'
    AND ltb.status   = 'pending'
    AND p.id         = ltb.user_id
    AND EXISTS (
      SELECT 1
      FROM public.match_timeline_events mte
      WHERE mte.match_id    = p_match_id
        AND mte.event_type  = 'goal'
        AND mte.is_own_goal = false
        AND mte.player_name = ltb.bet_value
    );

  -- Marquer gagnants
  UPDATE public.long_term_bets ltb
  SET status = 'won'
  WHERE ltb.match_id = p_match_id
    AND ltb.bet_type = 'scorer'
    AND ltb.status   = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.match_timeline_events mte
      WHERE mte.match_id    = p_match_id
        AND mte.event_type  = 'goal'
        AND mte.is_own_goal = false
        AND mte.player_name = ltb.bet_value
    );

  -- Marquer perdants
  UPDATE public.long_term_bets
  SET status = 'lost'
  WHERE match_id = p_match_id
    AND bet_type = 'scorer'
    AND status   = 'pending';
END;
$$;
