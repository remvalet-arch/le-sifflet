-- Sprint 7ter: KOP flavor texts + PredictionDistribution preferences
-- 1. event_flavor_texts table
-- 2. notif_fun_kop preference on profiles
-- 3. Initial FR catalog (80-100 texts)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. event_flavor_texts table
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_flavor_texts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  locale     VARCHAR(5) NOT NULL DEFAULT 'fr',
  text       TEXT NOT NULL,
  tone       TEXT NOT NULL DEFAULT 'neutre'
               CHECK (tone IN ('neutre','chambrage','dramatique','ironique')),
  weight     INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  seasonal   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flavor_event_locale ON event_flavor_texts (event_type, locale)
  WHERE active = TRUE;

-- RLS: anyone can read, only service_role can write
ALTER TABLE event_flavor_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flavor_texts_select" ON event_flavor_texts FOR SELECT USING (active = TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. notif_fun_kop preference on profiles
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_fun_kop BOOLEAN NOT NULL DEFAULT TRUE;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Initial FR flavor catalog (86 texts)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO event_flavor_texts (event_type, locale, text, tone, weight) VALUES

-- GOAL (10 texts)
('goal','fr','{player} vient de planter ça comme si c''était un penalty d''entraînement. Stade en feu.','dramatique',2),
('goal','fr','Un petit but pour {player}, un grand moment pour le kop.','neutre',2),
('goal','fr','{player} à la {minute}ème — l''arbitre VAR a intérêt à rester concentré.','ironique',1),
('goal','fr','Pas de VAR là-dessus. But plein pot, irréfutable, magnifique.','neutre',2),
('goal','fr','{player} a décidé que c''était son soir. On valide.','chambrage',2),
('goal','fr','Ça sent le but de la soirée. {player} risque de dors dans son maillot.','chambrage',1),
('goal','fr','Le gardien adverse va ruminer ça toute la nuit.','ironique',1),
('goal','fr','Regardez {player} courir. C''est ça, la joie pure du football.','dramatique',2),
('goal','fr','But ! On arrête la VAR, on savoure d''abord.','neutre',3),
('goal','fr','La défense adverse a regardé passer comme un TGV.','ironique',1),

-- OWN GOAL (8 texts)
('own_goal','fr','Aïe. {player} vient d''offrir un cadeau dont personne ne voulait.','chambrage',2),
('own_goal','fr','CSC à la {minute}ème — le pire adversaire, c''est parfois soi-même.','ironique',3),
('own_goal','fr','{player} a trouvé la lucarne... du mauvais côté. Réputé difficile.','chambrage',2),
('own_goal','fr','Les CSC, c''est comme les soirs de frites : ça arrive à tout le monde.','ironique',1),
('own_goal','fr','La VAR n''y peut rien. C''est bien {player} qui vient de se tirer dans le pied.','neutre',2),
('own_goal','fr','L''arbitre aussi avait l''air gêné de lever le drapeau.','ironique',1),
('own_goal','fr','Moment difficile à {minute}ème. Le kop garde le silence deux secondes.','dramatique',2),
('own_goal','fr','Ouvrir la lucarne adverse sans le faire exprès, c''est un talent rare.','ironique',1),

-- YELLOW CARD (10 texts)
('yellow_card','fr','{player} reçoit un bristol jaune à la {minute}ème. Un de perdu, un de trouvé.','ironique',2),
('yellow_card','fr','Carton jaune. {player} a trouvé l''unique façon de ralentir le match.','ironique',2),
('yellow_card','fr','L''arbitre ressort le carton jaune. Les vestiaires vont causer ce soir.','neutre',2),
('yellow_card','fr','{player} colle un carton dans sa collection. Faute de style.','chambrage',1),
('yellow_card','fr','Biscotte ! {player} l''a bien cherché celle-là.','chambrage',3),
('yellow_card','fr','À la {minute}ème, {player} décide que les règles, c''est pour les autres.','ironique',2),
('yellow_card','fr','Tactique ou faute grossière ? On penche pour la seconde option.','ironique',1),
('yellow_card','fr','Le banc adverse applaudit. Le public aussi, mais pas pour les mêmes raisons.','chambrage',1),
('yellow_card','fr','Un avertissement à la {minute}ème — le coach va passer un quart d''heure difficile.','neutre',2),
('yellow_card','fr','{player} est averti. Un autre comme ça et il regardera la suite au chaud.','neutre',2),

-- RED CARD (8 texts)
('red_card','fr','{player} prend la rouge à la {minute}ème. Les douches chaudes l''attendent.','neutre',3),
('red_card','fr','Carton rouge direct. {player} a transformé un match en roman noir.','dramatique',2),
('red_card','fr','Expulsé ! Et maintenant on joue à dix. Nuit difficile en perspective.','dramatique',2),
('red_card','fr','{player} rentre au vestiaire. La VAR a confirmé, on ne discute pas.','neutre',2),
('red_card','fr','2ᵉ jaune pour {player}. Une sortie prévisible, pas vraiment surprenante.','ironique',2),
('red_card','fr','La rouge à la {minute}ème — le coach va devoir réorganiser tout ça très vite.','dramatique',1),
('red_card','fr','Faute grossière. L''arbitre n''a même pas hésité une seconde.','neutre',2),
('red_card','fr','Le stade retient son souffle. {player} repart sous les sifflets.','dramatique',1),

-- SUBSTITUTION (8 texts)
('substitution','fr','Changement à la {minute}ème — le coach sort son joker. Ou son fusible.','ironique',2),
('substitution','fr','Les jambes fraîches arrivent. Les jambes fatiguées sont soulagées.','neutre',2),
('substitution','fr','Remplacement à la {minute}ème. Tactique ou punition ? Seul le coach sait.','ironique',3),
('substitution','fr','On rentre le remplaçant. Le match change peut-être de visage.','neutre',2),
('substitution','fr','À la {minute}ème, le banc s''agite. Les plans se réajustent.','dramatique',1),
('substitution','fr','Le remplacé quitte le terrain. Son regard dit tout.','dramatique',2),
('substitution','fr','Changement offensif ou défensif ? Le kop va analyser ça en détail.','neutre',1),
('substitution','fr','Entrant frais à la {minute}ème — c''est maintenant ou jamais.','dramatique',2),

-- PENALTY (10 texts)
('penalty','fr','Penalty ! Le VAR-TIME kop entre en effervescence. Juste ou scandaleux ?','dramatique',3),
('penalty','fr','Coup de sifflet, bras pointé vers le point de penalty. Tout le monde sur le bord du siège.','dramatique',2),
('penalty','fr','Pénalty à la {minute}ème — maintenant on voit qui a les nerfs solides.','dramatique',2),
('penalty','fr','Penalty obtenu. La main ? Le pied ? La question divise le kop.','ironique',2),
('penalty','fr','Le gardien plonge… et c''est dedans. Ou pas. Kop en attente.','neutre',1),
('penalty','fr','Penalty arrêté ! Le gardien est immense. Retour à la case départ.','dramatique',2),
('penalty','fr','Penalty raté à la {minute}ème. Le silence après, c''est quelque chose.','dramatique',2),
('penalty','fr','L''arbitre VAR a validé. Le point de penalty ne ment pas.','neutre',2),
('penalty','fr','Penalty transformé. La froide précision du buteur.','neutre',2),
('penalty','fr','Tirs au but dans un match de Coupe ? Là c''est du cinéma pur.','chambrage',1),

-- VAR REVIEW (8 texts)
('var_review','fr','La VAR entre en scène. Tout le monde fixe l''écran.','dramatique',3),
('var_review','fr','Check VAR à la {minute}ème — l''arbitre consulte l''assistant vidéo. Ambiance électrique.','dramatique',2),
('var_review','fr','VAR en cours. Le foot moderne réunit l''arbitre et l''écran dans une relation compliquée.','ironique',2),
('var_review','fr','Intervention VAR. Maintenant on attend, et on débat. C''est pour ça qu''on est là.','neutre',3),
('var_review','fr','La technique au service de l''arbitrage. Ou vice versa. Le débat est ouvert.','ironique',1),
('var_review','fr','VAR consultée à la {minute}ème. Qui a raison, l''arbitre ou l''écran ?','chambrage',2),
('var_review','fr','Tout le stade retient son souffle. La VAR va trancher.','dramatique',2),
('var_review','fr','Vérification vidéo en cours. Le temps suspend son vol.','dramatique',1),

-- KICKOFF (6 texts)
('kickoff','fr','Et c''est parti ! Le kop prend sa place, le match commence.','neutre',3),
('kickoff','fr','Coup d''envoi. La pelouse attend son verdict.','dramatique',2),
('kickoff','fr','Début de match — le stade s''embrase, le kop aussi.','neutre',2),
('kickoff','fr','Sifflet initial. Maintenant c''est pour de vrai.','neutre',2),
('kickoff','fr','Le ballon roule. Bienvenue dans 90 minutes d''émotions.','dramatique',2),
('kickoff','fr','Coup d''envoi — activez vos pronos et choisissez votre camp.','ironique',1),

-- HALFTIME (6 texts)
('halftime','fr','Mi-temps ! Le coach a 15 minutes pour changer la face du monde.','ironique',3),
('halftime','fr','Mi-temps. Les joueurs soufflent, le kop commente.','neutre',2),
('halftime','fr','Pause bien méritée. Ou pas. Selon le score.','ironique',2),
('halftime','fr','15 minutes pour recharger les batteries et reprendre le débat.','neutre',2),
('halftime','fr','Mi-temps — les analystes de salon sortent leur tableau tactique imaginaire.','ironique',1),
('halftime','fr','Pause citron. Ce qui se passe dans le vestiaire reste dans le vestiaire.','chambrage',2),

-- FULLTIME (6 texts)
('fulltime','fr','Coup de sifflet final ! Le résultat est acté. Les pronos aussi.','neutre',3),
('fulltime','fr','Fin du match. L''arbitre range ses cartons, le kop range ses analyses.','ironique',2),
('fulltime','fr','C''est terminé. Les stats ne mentent pas — ou si ? Débat ouvert.','chambrage',2),
('fulltime','fr','90 minutes de football, une vie de souvenirs. Ou presque.','dramatique',2),
('fulltime','fr','Fin du match — les résultats des pronos tombent dans quelques instants.','neutre',3),
('fulltime','fr','Le dernier sifflet résonne. Qui avait vu juste ?','dramatique',2),

-- EXTRA TIME (6 texts)
('extra_time','fr','Temps additionnel ! Encore quelques minutes pour changer l''histoire.','dramatique',3),
('extra_time','fr','L''arbitre annonce {minute} minutes de temps additionnel. Le kop recalcule.','ironique',2),
('extra_time','fr','Prolongations — le football aime faire durer le suspense.','dramatique',2),
('extra_time','fr','Encore du temps de jeu. Les jambes vont parler.','neutre',2),
('extra_time','fr','Temps additionnel : la dernière chance des uns, le dernier espoir des autres.','dramatique',1),
('extra_time','fr','Le chrono tourne encore. Tout est possible. C''est pour ça qu''on aime le foot.','neutre',2);
