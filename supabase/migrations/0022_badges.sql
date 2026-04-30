-- Badges + table de jointure user_badges

CREATE TABLE public.badges (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text        UNIQUE NOT NULL,
  label        text        NOT NULL,
  description  text        NOT NULL,
  icon_name    text        NOT NULL,
  criteria_type text       NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE public.user_badges (
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id    uuid        REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);

-- RLS
ALTER TABLE public.badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all"
  ON public.badges FOR SELECT USING (true);

CREATE POLICY "user_badges_select_own"
  ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

-- Realtime pour les toasts de déblocage côté client
ALTER TABLE public.user_badges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;

-- Seed badges
INSERT INTO public.badges (slug, label, description, icon_name, criteria_type) VALUES
  ('oeil_de_faucon', 'Oeil de Faucon',    'Gagner 3 paris VAR d''affilée',         'Eye',          'var_streak_3'),
  ('nostradamus',    'Nostradamus',        'Trouver un score exact parfait',         'Sparkles',     'exact_score_win'),
  ('collina',        'Pierluigi Collina', 'Atteindre le statut Modérateur',         'Shield',       'moderator_status'),
  ('chat_noir',      'Le Chat Noir',       'Perdre 5 paris VAR dans le même match', 'Ghost',        'var_loss_5_same_match'),
  ('fidele',         'Fidèle au Poste',    'Se connecter 3 jours de suite',         'CalendarCheck','login_streak_3'),
  ('goleador',       'Goleador',           'Trouver un buteur correct',             'Trophy',       'scorer_win');
