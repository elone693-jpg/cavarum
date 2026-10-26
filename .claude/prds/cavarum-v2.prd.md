# Cavarum v2 — Gestion de cave à rhum avec coût réel et double valorisation

> Sources : [PROMPT-CAVARUM.md](../../PROMPT-CAVARUM.md) (vision complète) · [docs/existant.md](../../docs/existant.md) (inventaire de la v1 Lovable).

## Problème

Un collectionneur de rhums premium et rares ne sait pas ce que sa cave lui a **réellement coûté** ni ce qu'elle **vaut vraiment**.
- L'app actuelle ne compte ni taxes, ni transport, ni frais d'envoi pour les bouteilles achetées en Métropole ou aux enchères.
- Elle affiche une seule « valeur » qui mélange le prix de rachat et le prix de revente.
- Elle range les informations clés (n° de fût, batch) dans des notes libres.

Sans solution, les plus-values affichées sont fausses, la cave ne peut pas être assurée ni vendue sur une base fiable, et l'app actuelle ne peut plus évoluer.

## Preuves

- **Observé** dans l'app v1 (docs/existant.md, §5) :
  - aucune logique de taxes, de frais ou de douane dans le code ;
  - une seule valeur par bouteille (`current_value`) ;
  - n° de fût et batch concaténés dans les notes ;
  - historique des valeurs enregistré mais jamais affiché ;
  - statistiques limitées à une répartition par pays.
- **Observé** sur le marché : RumX (~26 000 rhums, ~47 boutiques partenaires) propose une gestion de collection, mais aucun calcul de coût rendu cave pour les DOM ni de valeur de revente nette de commissions.
- **Hypothèse, à valider sur 5 achats réels avec factures et frais** : l'écart entre le prix payé et le coût rendu cave est significatif. **TBD — chiffrer l'écart moyen.**
- **Hypothèse, à valider par un comptage dans la base v1** : volume actuel de la collection. **TBD.**

## Utilisateurs

- **Principal** : le propriétaire de la cave, collectionneur de rhums premium et rares (agricoles AOC, embouteilleurs indépendants, éditions limitées).
  - Il achète souvent en Métropole ou aux enchères et fait expédier vers sa cave.
  - Le besoin se déclenche à chaque achat (*combien m'a-t-elle coûté ?*), à chaque consultation de la cave (*combien vaut-elle ?*) et avant une vente (*combien vais-je réellement toucher ?*).
- **Secondaire** : un co-propriétaire ou membre du foyer (consultation ou édition d'une cave partagée).
- **Hors cible** :
  - les acheteurs occasionnels qui ne suivent pas la valeur ;
  - les professionnels (cavistes, maisons d'enchères) qui cherchent un outil de gestion de stock ou de vente ;
  - le public non majeur.
- **TBD — ouverture à d'autres collectionneurs** : à valider par une décision du propriétaire. Cela change les contraintes juridiques sur les sources de prix et la conformité.

## Hypothèse

Nous pensons que **le calcul du coût rendu cave (taxes, transport, frais) et une double valorisation (rachat neuf / revente nette)** donneront **une vision fiable de ce que la cave a coûté et de ce qu'elle vaut** au **collectionneur propriétaire**.

Nous saurons que c'est réussi quand **le coût rendu cave de 5 achats réels sera exact au centime près** et quand **80 % des bouteilles auront une valeur de revente datée de moins de 30 jours, avec sa source**.

## Indicateurs de succès

| Indicateur | Cible | Mesure |
|---|---|---|
| Exactitude du coût rendu cave | 5/5 cas réels exacts au centime | Comparaison avec les factures et frais réels fournis par le propriétaire |
| Couverture de la valeur de revente | ≥ 80 % des bouteilles en cave | Part des bouteilles ayant une valeur de revente sourcée et datée de moins de 30 jours |
| Couverture de la valeur de rachat | ≥ 80 % des bouteilles en cave | Même mesure pour le prix neuf |
| Rapidité d'ajout | < 1 min par bouteille, pour chacun des 3 modes (lien, IA, manuel) | Chronométrage de parcours de test |
| Migration sans perte | 100 % des caves, bouteilles, photos et historiques v1 repris | Rapport de migration (importé / ignoré / à vérifier) |
| Fiabilité de l'identification IA | TBD — taux de bonnes correspondances au 1er candidat | Échantillon de 20 bouteilles réelles |

## Périmètre

**MVP** — le minimum pour tester l'hypothèse :
- Authentification (email + mot de passe, réinitialisation), contrôle d'âge 18+.
- Plusieurs caves avec emplacements.
- Statuts des bouteilles : commandée, en transit, en cave, ouverte, vide, vendue.
- Ajout de bouteille par **lien**, par **recherche IA** et **manuellement**, avec :
  - un écran de validation ;
  - un indice de confiance ;
  - la détection des doublons.
- Fiche bouteille avec champs dédiés : embouteilleur, millésime, n° de fût, n° de bouteille, état, facture jointe.
- **Coût rendu cave** :
  - détail ligne par ligne ;
  - territoire de résidence configurable ;
  - taux datés et versionnés ;
  - frais d'un colis répartis entre plusieurs bouteilles.
- **Valorisation simple** :
  - valeur de rachat (prix neuf chez 2 à 3 cavistes) ;
  - valeur de revente nette (prix adjugés chez 2 maisons d'enchères, moins les commissions et frais) ;
  - source, date et indice de confiance affichés ;
  - valeur saisie manuellement prioritaire.
- Tableau de bord : coût total, valeur de rachat, valeur de revente nette, plus-value latente.
- Conservation des acquis v1 : identification IA par description ou URL, quota IA, suivi des coûts IA (admin), import du catalogue.
- **Migration** des données v1, y compris l'extraction du n° de fût et du batch depuis les notes.

**Après le MVP** (voir les jalons) : photo d'étiquette, code-barres, import CSV, historique et courbes de valeur, alertes, liste d'envies, ventes, hors-ligne, toutes les sources de prix, cave partagée, rapport d'assurance, notes de dégustation, anglais.

**Hors périmètre**
- Vente ou achat de rhum dans l'app (marketplace) : responsabilité légale (vente d'alcool), hors du besoin.
- Réseau social et notes communautaires : RumX couvre déjà ce besoin.
- Conseil fiscal ou financier personnalisé : uniquement des informations indicatives, pas de conseil.
- Applications natives iOS/Android : l'app reste une PWA installable.
- Abonnements payants : tant que l'usage reste personnel.

## Jalons de livraison

| # | Jalon | Résultat visible | Statut | Plan |
|---|---|---|---|---|
| 1 | Socle et migration | Je me connecte à la v2 et je retrouve toutes mes caves, bouteilles et photos de la v1 | in-progress | `.claude/plans/cavarum-v2-jalon-1-socle-migration.plan.md` |
| 2 | Ajout de bouteilles | J'ajoute une bouteille par lien, par IA ou à la main en moins d'une minute, sans doublon | pending | — |
| 3 | Coût rendu cave | Chaque bouteille affiche son coût réel arrivée chez moi, détaillé ligne par ligne | pending | — |
| 4 | Double valorisation et tableau de bord | Je vois pour chaque bouteille et pour la cave la valeur de rachat, la revente nette et la plus-value, avec sources et dates | pending | — |
| 5 | V1 enrichie | Photo d'étiquette, code-barres, import CSV, courbes de valeur, alertes, liste d'envies, ventes, hors-ligne | pending | — |
| 6 | V2 complète | Toutes les sources de prix, comparables, cave partagée, rapport d'assurance PDF, dégustation, anglais | pending | — |

## Questions ouvertes

- [ ] **Territoire de la cave principale** (quel DOM, ou Métropole). Toute la formule du coût rendu cave en dépend.
- [ ] **5 cas d'achat réels** (factures, frais de port, frais de transitaire, taxes payées) pour servir de référence de test.
- [ ] **Socle technique** : garder la base actuelle pour simplifier la migration, ou repartir de zéro.
- [ ] **Usage** : personnel/familial ou ouvert à d'autres collectionneurs (avec ou sans abonnement).
- [ ] **Sources de prix prioritaires** pour le MVP : 3 cavistes et 2 maisons d'enchères, et leurs conditions d'utilisation.
- [ ] **Fréquence d'actualisation des prix** et budget mensuel pour l'IA et la collecte.
- [ ] **Interface** : conserver l'identité visuelle actuelle à l'identique, ou la refondre.
- [ ] **Code serveur v1** (prompts IA, algorithme de prix, règles d'accès) : à récupérer par export Lovable/GitHub pour reprendre ce qui fonctionne.
- [ ] **Déclencheur** de la refonte au-delà des limites techniques (assurance, vente prévue, taille de la collection).

## Risques

| Risque | Probabilité | Impact | Atténuation |
|---|---|---|---|
| Les sites de prix interdisent ou bloquent la collecte automatique (CGU, anti-robot) | Élevée | Élevé | Priorité aux API et partenariats, cadence limitée, cache, sources remplaçables, saisie manuelle prioritaire |
| Peu de prix adjugés pour les bouteilles rares : valeur de revente peu fiable | Élevée | Moyen | Estimation par comparables signalée comme telle, indice de confiance, ancienneté visible |
| Taux de taxes DOM mal connus ou qui changent | Moyenne | Élevé | Taux datés et sourcés, validation sur les 5 cas réels, révision annuelle |
| Mauvais rapprochement d'une même bouteille entre plusieurs sites (éditions, millésimes) | Moyenne | Élevé | File de révision manuelle pour les cas ambigus, confirmation à l'ajout |
| Perte de données lors de la migration v1 | Faible | Élevé | Migration rejouable, rapport détaillé, période de double fonctionnement |
| Coûts IA ou de collecte qui dérivent | Moyenne | Moyen | Quotas par utilisateur, suivi des coûts (acquis v1), budget mensuel défini |
| Failles d'accès héritées de la v1 (rôle admin vérifié côté interface, photos publiques) | Moyenne | Moyen | Contrôles d'accès côté serveur et revue de sécurité avant mise en production |

---
*Statut : BROUILLON — exigences uniquement. Planification de la mise en œuvre à venir via /plan.*
