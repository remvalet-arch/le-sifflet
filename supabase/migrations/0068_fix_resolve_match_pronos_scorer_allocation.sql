-- 0068 : Fix resolve_match_pronos — scorer_allocation avec prono_value en objet JSON
-- Avant : jsonb_array_elements_text() plantait si prono_value était un objet JSON
--         (ex. {"0":"Mbappe"}) au lieu d'un tableau (["Mbappe"]).
--         Le BEGIN...EXCEPTION ne couvrait que le cast, pas l'appel array_elements.
-- Après : jsonb_typeof() vérifie que le cast donne bien un tableau avant usage.

CREATE OR REPLACE FUNCTION public.resolve_match_pronos(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status           text;
  v_home             integer;
  v_away             integer;
  v_final            text;
  v_real_1n2         text;
  r                  record;
  v_won              boolean;
  v_n_won            integer := 0;
  v_n_lost           integer := 0;

  v_total_1n2_ok     integer := 0;
  v_exact_score_ok   integer := 0;
  v_cp_pct           numeric;
  v_cp_bonus         integer := 30;

  v_prono_home       integer;
  v_prono_away       integer;
  v_prono_1n2        text;
  v_pts              integer;
  v_cp_earned        integer;
  v_scorers_json     jsonb;
  v_scorer_name      text;
  v_scorer_pts       integer;
  v_scorer_match     boolean;

  c_xp_prono_won     constant integer := 45;
  c_base_1n2_pts     constant integer := 50;
  c_scorer_pts       constant integer := 30;
BEGIN
  SELECT m.status, m.home_score, m.away_score
    INTO v_status, v_home, v_away
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'match_not_found');
  END IF;
  IF v_status IS DISTINCT FROM 'finished' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_finished', 'status', v_status);
  END IF;
  IF v_home IS NULL OR v_away IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_scores');
  END IF;

  v_final    := v_home::text || '-' || v_away::text;
  v_real_1n2 := CASE
    WHEN v_home > v_away THEN 'H'
    WHEN v_home = v_away THEN 'D'
    ELSE 'A'
  END;

  -- Pré-calcul contre-pied sur les exact_score pending
  SELECT
    COUNT(*) FILTER (WHERE
      prono_type = 'exact_score'
      AND SPLIT_PART(prono_value, '-', 1) ~ '^\d+$'
      AND SPLIT_PART(prono_value, '-', 2) ~ '^\d+$'
      AND (CASE
        WHEN SPLIT_PART(prono_value, '-', 1)::int > SPLIT_PART(prono_value, '-', 2)::int THEN 'H'
        WHEN SPLIT_PART(prono_value, '-', 1)::int = SPLIT_PART(prono_value, '-', 2)::int THEN 'D'
        ELSE 'A'
      END) = v_real_1n2
    ),
    COUNT(*) FILTER (WHERE
      prono_type = 'exact_score'
      AND lower(trim(prono_value)) = lower(trim(v_final))
    )
  INTO v_total_1n2_ok, v_exact_score_ok
  FROM public.pronos
  WHERE match_id = p_match_id AND status = 'pending';

  IF v_total_1n2_ok >= 5 THEN
    v_cp_pct   := (v_exact_score_ok::numeric / v_total_1n2_ok::numeric) * 100;
    v_cp_bonus := CASE
      WHEN v_cp_pct > 40 THEN 10
      WHEN v_cp_pct > 15 THEN 30
      WHEN v_cp_pct > 5  THEN 60
      ELSE 100
    END;
  END IF;

  FOR r IN
    SELECT * FROM public.pronos
    WHERE match_id = p_match_id AND status = 'pending'
    ORDER BY placed_at
  LOOP
    v_won       := false;
    v_pts       := 0;
    v_cp_earned := 0;

    IF r.prono_type = 'exact_score' THEN
      IF SPLIT_PART(r.prono_value, '-', 1) ~ '^\d+$'
         AND SPLIT_PART(r.prono_value, '-', 2) ~ '^\d+$' THEN
        v_prono_home := SPLIT_PART(r.prono_value, '-', 1)::integer;
        v_prono_away := SPLIT_PART(r.prono_value, '-', 2)::integer;
        v_prono_1n2  := CASE
          WHEN v_prono_home > v_prono_away THEN 'H'
          WHEN v_prono_home = v_prono_away THEN 'D'
          ELSE 'A'
        END;

        IF v_prono_1n2 = v_real_1n2 THEN
          v_won := true;
          v_pts := c_base_1n2_pts;

          IF lower(trim(r.prono_value)) = lower(trim(v_final)) THEN
            v_cp_earned := v_cp_bonus;
            v_pts       := v_pts + v_cp_earned;
          END IF;
        END IF;
      END IF;

      IF v_won THEN
        UPDATE public.pronos p
          SET status = 'won', points_earned = v_pts, contre_pied_bonus = v_cp_earned
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance = pr.sifflets_balance + v_pts,
                xp               = pr.xp + c_xp_prono_won,
                rank             = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at       = now()
            WHERE pr.id = r.user_id;
          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p
          SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    ELSIF r.prono_type = 'scorer' THEN
      v_won := EXISTS (
        SELECT 1 FROM public.match_timeline_events e
        WHERE e.match_id = p_match_id
          AND e.event_type = 'goal'
          AND e.player_name IS NOT NULL
          AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(r.prono_value), '\s+', ' ', 'g'))
      );

      IF v_won THEN
        UPDATE public.pronos p
          SET status = 'won', points_earned = c_scorer_pts
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance = pr.sifflets_balance + c_scorer_pts,
                xp               = pr.xp + c_xp_prono_won,
                rank             = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at       = now()
            WHERE pr.id = r.user_id;
          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p
          SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    ELSIF r.prono_type = 'scorer_allocation' THEN
      v_scorer_pts := 0;
      BEGIN
        v_scorers_json := r.prono_value::jsonb;
        -- Protège contre un objet JSON au lieu d'un tableau (ex. {"0":"Mbappe"})
        IF jsonb_typeof(v_scorers_json) <> 'array' THEN
          v_scorers_json := '[]'::jsonb;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_scorers_json := '[]'::jsonb;
      END;

      FOR v_scorer_name IN
        SELECT elem FROM jsonb_array_elements_text(v_scorers_json) elem
      LOOP
        v_scorer_match := EXISTS (
          SELECT 1 FROM public.match_timeline_events e
          WHERE e.match_id = p_match_id
            AND e.event_type = 'goal'
            AND e.player_name IS NOT NULL
            AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
                = lower(regexp_replace(trim(v_scorer_name), '\s+', ' ', 'g'))
        );
        IF v_scorer_match THEN
          v_scorer_pts := v_scorer_pts + c_scorer_pts;
        END IF;
      END LOOP;

      IF v_scorer_pts > 0 THEN
        UPDATE public.pronos p
          SET status = 'won', points_earned = v_scorer_pts
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance = pr.sifflets_balance + v_scorer_pts,
                xp               = pr.xp + c_xp_prono_won,
                rank             = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at       = now()
            WHERE pr.id = r.user_id;
          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p
          SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    ELSE
      CONTINUE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',                true,
    'match_id',          p_match_id,
    'final_score',       v_final,
    'won',               v_n_won,
    'lost',              v_n_lost,
    'contre_pied_bonus', v_cp_bonus,
    'total_1n2_ok',      v_total_1n2_ok,
    'exact_score_ok',    v_exact_score_ok
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_match_pronos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_match_pronos(uuid) TO service_role;
