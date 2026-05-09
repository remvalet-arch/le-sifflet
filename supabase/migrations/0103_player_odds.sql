-- Cotes individuelles des joueurs (buteurs) issues d'API-Football.
-- Peuplé via le service api-football-odds-sync depuis l'admin.
CREATE TABLE public.player_odds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  odd_anytime NUMERIC(6,2),
  odd_first   NUMERIC(6,2),
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_name)
);

CREATE INDEX idx_player_odds_match ON public.player_odds(match_id);

ALTER TABLE public.player_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_odds_select" ON public.player_odds
  FOR SELECT USING (true);
