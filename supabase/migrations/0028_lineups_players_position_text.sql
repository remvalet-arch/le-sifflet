-- Postes TSDB : libellés bruts (ex. "Right Winger") en plus de G/D/M/A.
-- Retire les CHECK historiques pour autoriser tout texte sur lineups.position et players.position.

ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_position_check;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_position_check;
