-- FK2-4: default VAR quick-bet amount per profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_var_bet_amount INT NOT NULL DEFAULT 50;
