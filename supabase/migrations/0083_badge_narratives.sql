-- MPP-1 : Réécriture narrative des descriptions de badges
-- Règles : tutoiement, hook émotionnel, punchline chambreur/flatteur, max 2 phrases.

UPDATE public.badges SET description = 'Tu sens l''arnaque avant tout le monde. 3 paris VAR gagnés d''affilée — la VAR n''a aucun secret pour toi.'
WHERE slug = 'oeil_de_faucon';

UPDATE public.badges SET description = 'Score parfait trouvé alors que personne n''y croyait. Si ça se trouve, t''as regardé le match depuis le futur.'
WHERE slug = 'nostradamus';

UPDATE public.badges SET description = 'On ne siffle plus sans toi. Accès Modérateur débloqué — les marchés, c''est toi qui les ouvres.'
WHERE slug = 'collina';

UPDATE public.badges SET description = 'Personne n''aime jouer contre toi. 5 paris VAR perdus dans le même match — c''est statistique, ça.'
WHERE slug = 'chat_noir';

UPDATE public.badges SET description = 'Présent. Toujours. 3 jours de connexion d''affilée — le stade virtuel a son ultras fidèle.'
WHERE slug = 'fidele';

UPDATE public.badges SET description = 'Tu l''avais senti, lui. Buteur trouvé pile — et tes Sifflets t''en remercient.'
WHERE slug = 'goleador';
