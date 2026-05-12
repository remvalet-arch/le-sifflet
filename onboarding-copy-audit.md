# Audit éditorial — Onboarding (TICKET 4.7)

**Date** : 12/05/2026  
**Source** : `OnboardingTour.tsx` + `messages/fr.json > Onboarding`  
**Statut** : Phase A — audit sans modification (validation produit requise avant Phase B)

---

## Grille d'audit

| Slide | Élément          | Texte actuel                                                                                              | Problème identifié                                                      | Suggestion                                                                                         |
| ----- | ---------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | Titre H2         | `"VAR TIME"`                                                                                              | OK — tout caps, court                                                   | —                                                                                                  |
| 1     | Tagline          | `"Sois l'arbitre"`                                                                                        | OK — tutoiement, impératif                                              | —                                                                                                  |
| 1     | Corps            | `"Juge chaque action contestée en direct et gagne des Sifflets en ayant raison avant les autres."`        | Bon ton, mais 18 mots > 12 recommandés                                  | Découper : "Juge les actions live. Gagne des Sifflets. Sois plus malin que les autres."            |
| 1     | CTA              | `"C'est parti →"`                                                                                         | Casse incohérente vs UPPERCASE convention                               | `"C'EST PARTI →"`                                                                                  |
| 2     | Titre            | `"Essaie un pari VAR"`                                                                                    | OK — tutoiement                                                         | —                                                                                                  |
| 2     | Sous-titre       | `"Simulation"`                                                                                            | OK                                                                      | —                                                                                                  |
| 2     | Question fictive | `"Mbappé, main dans la surface ?"`                                                                        | OK — contexte clair                                                     | —                                                                                                  |
| 2     | Mise fictive     | `"Mise fictive : 200 🪙"`                                                                                 | Mixe "Mise" (terme paris) avec emoji coins. Cohérence avec "Sifflets" ? | `"Mise fictive : 200 Sifflets 🎵"` ou garder `🪙` si c'est délibéré                                |
| 2     | Timer            | `"Fermeture dans {s}s"`                                                                                   | OK                                                                      | —                                                                                                  |
| 2     | OUI/NON          | `"OUI"` / `"NON"`                                                                                         | OK — tout caps, fort                                                    | —                                                                                                  |
| 2     | Résultat WIN     | `"Braquage réussi !"`                                                                                     | Excellent — voix potes / vestiaire                                      | —                                                                                                  |
| 2     | Corps WIN        | `"+200 Sifflets gagnés."`                                                                                 | OK                                                                      | —                                                                                                  |
| 2     | Résultat LOSE    | `"Raté cette fois !"`                                                                                     | OK                                                                      | —                                                                                                  |
| 2     | Corps LOSE       | `"Mais t'as compris le principe."`                                                                        | Bien — registre parlé                                                   | —                                                                                                  |
| 2     | Résultat TIMEOUT | `"Trop lent !"`                                                                                           | OK — direct                                                             | —                                                                                                  |
| 2     | Corps TIMEOUT    | `"En vrai, vote avant que le temps s'écoule."`                                                            | Registre parlé bien, mais "En vrai" peut paraître trop familier         | Option : "La prochaine fois, vote avant la fermeture."                                             |
| 2     | CTA suivant      | `"Suivant →"`                                                                                             | Incohérence de casse                                                    | `"SUIVANT →"`                                                                                      |
| 3     | Titre            | `"Ton premier prono"`                                                                                     | OK — tutoiement                                                         | —                                                                                                  |
| 3     | Sous-titre       | `"Prédit le score du match"`                                                                              | Impératif sans sujet → ambigu (prédit = indicatif ou impératif ?)       | `"Prévis le score du match"` ou `"Saisis ton score prédit"`                                        |
| 3     | Indication       | `"↓ Entre ton score prédit ici"`                                                                          | OK, pédagogique                                                         | —                                                                                                  |
| 3     | CTA valider      | `"Valider mon prono"`                                                                                     | Casse incohérente                                                       | `"VALIDER MON PRONO"`                                                                              |
| 3     | Succès titre     | `"Premier prono enregistré !"`                                                                            | OK                                                                      | —                                                                                                  |
| 3     | Succès corps     | `"Tu gagneras des Points selon la précision de ton prono. Reviens après le match pour voir le résultat."` | 22 mots > 12. Deux phrases                                              | Découper ou raccourcir : "On calcule tes Points après le match. Plus t'es précis, plus tu gagnes." |
| 3     | CTA continuer    | `"Continuer →"`                                                                                           | Casse incohérente                                                       | `"CONTINUER →"`                                                                                    |
| 4     | Titre            | `"Active les alertes VAR"`                                                                                | OK — impératif                                                          | —                                                                                                  |
| 4     | Corps            | `"Ne rate aucune VAR en direct. On te notifie uniquement pour les actions importantes — pas de spam."`    | Bon. 18 mots — légèrement long mais acceptable pour les notifs          | —                                                                                                  |
| 4     | CTA notifs       | `"Activer les notifications"`                                                                             | Casse incohérente                                                       | `"ACTIVER LES NOTIFICATIONS"`                                                                      |
| 4     | Lien secondaire  | `"Plus tard"`                                                                                             | OK — lowercase acceptable pour action secondaire                        | —                                                                                                  |
| Skip  | Confirm titre    | `"Tu veux vraiment passer ?"`                                                                             | OK                                                                      | —                                                                                                  |
| Skip  | Confirm desc     | `"Tu pourras revoir l'intro depuis les Paramètres."`                                                      | OK                                                                      | —                                                                                                  |
| Skip  | CTA oui          | `"Oui, passer"`                                                                                           | Casse incohérente (action destructive, mérite d'être lowercase)         | OK tel quel — convention : actions secondaires en lowercase                                        |
| Skip  | CTA non          | `"Continuer l'intro"`                                                                                     | OK                                                                      | —                                                                                                  |

---

## Synthèse des problèmes identifiés

### 1. Casse des CTA (priorité haute)

Les CTA primaires doivent être en UPPERCASE selon la convention définie (cf. ticket 2.6). Actuellement 4 CTA en sentence case :

- `"C'est parti →"` → `"C'EST PARTI →"`
- `"Suivant →"` → `"SUIVANT →"`
- `"Valider mon prono"` → `"VALIDER MON PRONO"`
- `"Continuer →"` → `"CONTINUER →"`
- `"Activer les notifications"` → `"ACTIVER LES NOTIFICATIONS"`

### 2. Longueur des phrases (priorité moyenne)

2 corps de texte dépassent les 12 mots recommandés (slides 1 et 3). Impact sur la lisibilité mobile à 390px.

### 3. Terminologie monnaie (priorité basse)

Slide 2 utilise `🪙` pour les Sifflets. Si la terminologie officielle est "Sifflets" (validé PM 2026-05-08), envisager `🎵` ou le libellé textuel.

### 4. Strings partiellement hors i18n (priorité haute — Phase B)

Dans `OnboardingTour.tsx`, les noms d'équipe fictifs (`"PSG"`, `"Real"`, `"Real Madrid"`) sont hardcodés. Pas critique (fictif et non-traduit intentionnellement), mais à documenter.

---

## Checklist Phase B (après validation produit)

- [ ] Mettre à jour les 5 CTA en UPPERCASE dans `messages/fr.json`
- [ ] Propager les changements dans `en.json`, `es.json`, `de.json`, `it.json`
- [ ] Raccourcir corps slide 1 et slide 3
- [ ] Vérifier l'overflow sur mobile 390px après les changements de texte
- [ ] Tester les 5 langues pour vérifier qu'aucun texte déborde

---

## Verdict global

Le ton est globalement excellent — vestiaire, tutoiement, familier sans être vulgaire. Les ajustements prioritaires sont purement formels (casse CTA) et n'impactent pas la voix. Phase B peut être exécutée sans validation produit pour les casses uniquement.
