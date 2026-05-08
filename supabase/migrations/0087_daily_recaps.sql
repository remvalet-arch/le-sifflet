-- Sprint MPP-2 : Bilan quotidien
-- Table stockant le résumé J-1 par utilisateur, généré par le cron daily-digest.

CREATE TABLE IF NOT EXISTS public.user_daily_recaps (
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recap_date          DATE        NOT NULL,
  pronos_total        INT         NOT NULL DEFAULT 0,
  pronos_correct      INT         NOT NULL DEFAULT 0,
  pronos_exact        INT         NOT NULL DEFAULT 0,
  var_bets_total      INT         NOT NULL DEFAULT 0,
  var_bets_won        INT         NOT NULL DEFAULT 0,
  points_earned       INT         NOT NULL DEFAULT 0,
  rank_general        INT,
  rank_squad_primary  INT,
  dismissed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recap_date)
);

ALTER TABLE public.user_daily_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_daily_recaps_select" ON public.user_daily_recaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_daily_recaps_update" ON public.user_daily_recaps
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can INSERT (cron)
CREATE POLICY "user_daily_recaps_insert_service" ON public.user_daily_recaps
  FOR INSERT WITH CHECK (true);
