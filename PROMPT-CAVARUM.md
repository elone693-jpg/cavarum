# Cavarum v2 — Prompt de refonte

> Prompt maître à donner à Claude Code (plugins **ECC** + **REA**) pour reconstruire Cavarum.
> Les points marqués **[À TRANCHER]** sont des décisions à valider avant le développement.

---

## 0. Rôle et objectif

Tu es une équipe produit/tech senior (architecte, dev full-stack, data/scraping, QA, sécurité).
Tu reconstruis **Cavarum** (aujourd'hui sur `https://cavarum.lovable.app`, construite avec Lovable), une application **mobile-first (PWA)** de gestion de cave à rhum pour collectionneurs exigeants.

Objectif central : **savoir à tout instant ce que contient ma cave, ce qu'elle m'a réellement coûté (rendu chez moi) et ce qu'elle vaut aujourd'hui à l'achat et à la revente.**

Identité visuelle existante à conserver : thème sombre « cave », brun profond `#1a0f0a` et or `#d4a04a`, splash screen, installable sur iOS/Android, interface en français.

---

## 1. Méthode de travail imposée

1. **Rétro-ingénierie de l'existant (REA)** : analyser le bundle web de `cavarum.lovable.app` (`analyze_web_bundle`, `trace_application_feature`, `inspect_web_network_capture`) pour inventorier écrans, fonctionnalités, appels API, schéma de données (Supabase probable) et prompts IA. Produire `docs/existant.md`. Rien de ce qui existe ne doit être perdu.
2. **PRD** (`/ecc:plan-prd`) à partir de ce prompt + l'inventaire → `docs/PRD.md`.
3. **Plan** (`/ecc:plan`) découpé en lots livrables ; attendre ma validation avant tout code.
4. **Construction** (`/ecc:orch-build-mvp` puis `/ecc:orch-add-feature` par fonctionnalité) en **TDD**, couverture ≥ 80 % sur la logique métier (calculs de coût, de valeur, matching).
5. **Revue** (`/ecc:orch-review` + `security-reviewer` + `database-reviewer`) avant chaque commit.
6. **E2E** (`e2e-runner`) sur les parcours critiques : ajout par lien, ajout par IA, ajout manuel, valorisation, vente.

---

## 2. Utilisateurs et comptes

- Collectionneur principal (moi), avec possibilité d'un **foyer / co-propriétaire** (cave partagée, droits lecture ou édition).
- Partage public optionnel d'une cave ou d'une sélection (lien en lecture seule, prix masquables).
- Authentification : email + mot de passe, lien magique, Google, Apple. 2FA optionnelle. Réinitialisation de mot de passe.
- **Contrôle d'âge 18+** à l'inscription ; mentions « L'abus d'alcool… » (cadre loi Évin : l'app ne fait pas de publicité).
- RGPD : export complet de mes données, suppression du compte.

---

## 3. Caves et organisation physique

- **Plusieurs caves** (ex. « Cave Martinique », « Cave Paris », « Chez le transitaire », « En transit »).
- Emplacements hiérarchiques : cave → meuble/étagère → rangée → position. Vue « plan de cave » optionnelle.
- Statuts d'une bouteille : *commandée*, *en transit*, *en cave*, *ouverte*, *vide*, *vendue*, *offerte*, *échangée*, *perdue/cassée*.
- Bouteille ouverte : date d'ouverture, **niveau restant** (%), date de fin.
- Quantités et doublons : plusieurs exemplaires d'une même référence, chacun avec son propre achat, emplacement et numéro.
- Étiquettes libres (ex. « à garder », « à vendre », « pour la retraite », « à goûter »).

---

## 4. Ajouter une bouteille (4 + 2 modes)

Tous les modes aboutissent à un **écran de validation** pré-rempli, éditable, qui indique la source de chaque champ et un **score de confiance**. Détection de doublon (même référence déjà en cave → « ajouter un exemplaire ? »).

1. **Par lien internet** : je colle l'URL d'une fiche produit (boutique, RumX, maison d'enchères, distillerie).
   - Extraction dans l'ordre : JSON-LD `schema.org/Product` → OpenGraph/microdata → parseur dédié au site → extraction par LLM du HTML nettoyé.
   - Récupère : nom, marque, embouteilleur, âge, millésime, degré, contenance, prix, devise, disponibilité, photos, description.
   - Rattache automatiquement à la référence du catalogue (matching).
2. **Par recherche IA** : texte libre (« Clément 10 ans », « Velier Caroni 1996 Full proof »).
   - L'IA interroge le catalogue interne puis le web, renvoie **3 à 5 candidats** avec photo, différenciateurs (édition, millésime, degré) et confiance. Je choisis.
3. **Manuellement** : formulaire complet avec autocomplétion sur marques, distilleries, embouteilleurs, pays.
4. **Photo de l'étiquette** : reconnaissance par vision IA (nom, âge, degré, millésime, n° de fût, n° de bouteille), puis même flux que la recherche IA.
5. **Code-barres EAN** (scan caméra) → recherche catalogue.
6. **Import en masse** : CSV / Excel (avec mappage de colonnes), import depuis l'ancienne app Cavarum, depuis un export RumX.

---

## 5. Fiche bouteille (modèle de données métier)

**Référence (catalogue, partagée)** : nom commercial, marque, distillerie, **embouteilleur** (officiel ou indépendant : Velier, Habitation Velier, Kill Devil, The Rum Cask, Plantation, etc.), pays / île / région, **catégorie** (rhum agricole AOC Martinique, agricole hors AOC, traditionnel / mélasse, pur jus de canne, sirop, high-ester, rhum arrangé, épicé, liqueur), mode de distillation (colonne créole, alambic pot still, mixte), âge déclaré, **millésime**, dates de distillation et d'embouteillage, type et n° de fût (single cask), finish, degré, contenance (5 cl à 1,75 L, magnum), **édition limitée** (nombre de bouteilles produites), brut de fût oui/non, codes EAN, photos, description, liens externes (RumX, sites marchands), notes communautaires (RumX) si disponibles.

**Exemplaire (ma bouteille)** : référence, cave/emplacement, statut, **n° de bouteille** (ex. 123/300), état (étiquette, capsule, niveau, coffret/étui présent, certificat), photos personnelles, date d'acquisition, origine (achat, cadeau, échange, héritage), notes personnelles, note de dégustation sur 100 et/ou /10.

**Achat** : vendeur / boutique / enchère, pays d'achat, date, prix payé, devise et taux de change du jour, frais de port, frais d'enchère acheteur, remise, n° de commande, **facture jointe (PDF/photo)**, achat groupé (répartition des frais sur plusieurs bouteilles).

---

## 6. Coût de revient « rendu cave » (achats en Métropole ou à l'étranger)

Calcul **paramétrable et versionné** (les taux changent chaque année), avec détail ligne par ligne visible sur la fiche :

```
Prix d'achat TTC
− TVA métropolitaine récupérable (si achat détaxé à l'export vers les DOM)
+ Frais de port / transport (colis, groupage, conteneur, fret aérien)
+ Assurance transport
+ Frais d'envoi / transitaire / dédouanement / manutention
+ Droits d'accises applicables au territoire de destination (par litre d'alcool pur)
+ Cotisation sécurité sociale sur les boissons > 18 % vol. (si applicable)
+ Octroi de mer + octroi de mer régional (taux du territoire)
+ TVA locale (taux du territoire de destination)
= Coût de revient rendu cave
```

- **Territoire de résidence configurable** : Martinique, Guadeloupe, Guyane, Réunion, Mayotte, Métropole, étranger. **[À TRANCHER : ma cave principale est-elle dans un DOM ? lequel ?]**
- Table des taux administrable (date d'effet, source officielle, territoire) ; les calculs passés conservent le taux en vigueur à la date d'achat.
- Les frais d'un colis contenant plusieurs bouteilles sont **répartis** (au prorata du prix, du volume ou à parts égales, au choix).
- Cas inverses gérés : achat dans un DOM ramené en Métropole, achat hors UE (douane + TVA import), franchise voyageur (bouteilles en bagage).
- Mode « simulation » : *« combien me coûterait cette bouteille rendue chez moi ? »* avant achat.

---

## 7. Valorisation (achat et revente)

Deux valeurs distinctes par référence, avec **date, sources et indice de confiance** :

- **Valeur de remplacement (achat)** : prix neuf actuel le plus bas / médian chez les cavistes en stock (prix TTC + port estimé) → *« combien me coûterait de la racheter aujourd'hui »*.
- **Valeur de revente (marché secondaire)** : médiane pondérée des **prix adjugés récents** en enchères (12–24 mois, poids décroissant avec l'ancienneté), corrigée de l'état de l'exemplaire.
  - **Net vendeur** = prix adjugé estimé − commission vendeur − frais de listing − frais d'envoi vers la maison d'enchères (− taxe sur plus-value si applicable).

Règles :
- Bouteilles non trouvées : estimation par **références comparables** (même distillerie, âge, embouteilleur, millésime proche), clairement signalée comme estimation.
- Valeur saisie manuellement possible (prioritaire, datée).
- Conversion des devises (EUR, USD, GBP, CHF) au taux du jour de la transaction.
- **Historique des valeurs** stocké (série temporelle) → courbes par bouteille et pour la cave.
- **Rafraîchissement planifié** (ex. hebdomadaire, quotidien pour les bouteilles suivies) + bouton « actualiser maintenant ».
- Alertes : variation > X %, bouteille passée au-dessus d'un seuil, prix d'achat cible atteint sur la liste d'envies, bouteille de ma liste de chasse en stock quelque part.

Indicateurs : coût total, valeur de remplacement totale, valeur de revente nette totale, **plus-value latente** (€ et %), **rendement annualisé**, meilleures et pires performances.

---

## 8. Catalogue et sources de données

Construire un **catalogue interne unifié** de références de rhum, alimenté par des connecteurs par source (un adaptateur par site, testable, désactivable).

**Bases de données / communauté** : RumX (rumx.com, ~26 000 rhums, notes communautaires, comparateur des ~47 boutiques partenaires), Rum Ratings, sites des distilleries et embouteilleurs.

**Cavistes en ligne (prix neuf)**, sur le modèle d'Excellence Rhum : Excellence Rhum, Rhum Attitude, La Compagnie du Rhum, La Maison du Whisky (whisky.fr), Spirit Academy, Rum Stylez, Rhum Expert / autres partenaires RumX, The Whisky Exchange, Master of Malt, Drinks&Co, boutiques des distilleries (Clément, J.M, Neisson, HSE, Saint James, Longueteau, Damoiseau, Bielle…). **À compléter automatiquement** en explorant la liste des boutiques partenaires de RumX et des sites équivalents.

**Marché secondaire (prix de revente)** : Catawiki, Rum Auctioneer, Whisky Auctioneer, Scotch Whisky Auctions, Whisky.Auction, autres maisons d'enchères spiritueux, petites annonces spécialisées si exploitables.

Exigences :
- Priorité aux **API / flux officiels et partenariats** ; à défaut scraping **respectueux** (robots.txt, CGU, cadence limitée, user-agent identifié, cache). Chaque source a une fiche : méthode, fréquence, licence/CGU, état.
- **Matching / déduplication** des références entre sources (nom normalisé + distillerie + âge + millésime + degré + contenance + embouteilleur), avec file de révision manuelle pour les cas ambigus.
- Traçabilité : chaque prix stocké garde URL source, date de relevé, type (neuf / adjugé / annonce), devise, frais inclus ou non.
- Les données d'une source en panne n'écrasent jamais une valeur existante ; la confiance baisse avec l'âge du dernier relevé.

---

## 9. Tableau de bord et exploration

- Accueil : nombre de bouteilles, valeur totale (achat / remplacement / revente nette), plus-value latente, évolution sur 1 m / 6 m / 1 an / tout.
- Répartitions : pays/île, distillerie, embouteilleur, catégorie, âge, millésime, cave, statut.
- Top 10 plus-values / moins-values, bouteilles les plus chères, dernières entrées.
- Liste de la cave : recherche plein texte, filtres combinables, tri, vues liste / grille / photos, actions groupées.
- Fiche bouteille : photos, infos, achat et coût de revient détaillé, graphique de valeur, sources de prix cliquables, historique des mouvements.

---

## 10. Dégustation, envies, ventes

- **Notes de dégustation** (nez, bouche, finale, note) liées à un exemplaire ou une référence ; sessions de dégustation multi-bouteilles.
- **Liste d'envies / liste de chasse** avec prix cible et alertes de disponibilité.
- **Vente / sortie** : prix réalisé, frais, acheteur/plateforme → plus-value réalisée, historique des ventes.
- **Informations fiscales indicatives** (pas un conseil) : régime des plus-values sur biens meubles en France (seuil d'exonération par cession, taxe forfaitaire vs plus-value réelle), rappel de conserver les factures.
- **Rapport d'inventaire valorisé PDF** pour l'assurance (photos, n° de bouteille, factures, valeurs datées).

---

## 11. Exports, notifications, hors-ligne

- Export CSV / Excel / PDF de la cave et des achats ; sauvegarde complète JSON.
- Notifications push (PWA) et email : alertes de prix, récapitulatif mensuel de la valeur de la cave.
- **Mode hors-ligne** : consultation de la cave et ajout manuel sans réseau, synchronisation au retour.
- Langues : français (défaut), anglais. Devise d'affichage configurable.

---

## 12. Exigences techniques

- **Stack [À TRANCHER]** : proposition — React + TypeScript + Vite (ou Next.js), Tailwind + shadcn/ui, **Supabase** (Postgres, Auth, Storage, Edge Functions, RLS) pour faciliter la migration depuis Lovable ; jobs planifiés pour le rafraîchissement des prix ; LLM Claude (dernier modèle disponible) pour extraction, recherche IA et vision étiquette.
- Sécurité : RLS sur toutes les tables, clés API uniquement côté serveur, validation des URL saisies (protection SSRF du fetcher de liens), quotas d'appels IA par utilisateur.
- Calculs monétaires en décimal (jamais en flottant), arrondis explicites.
- Performance : liste de 2 000 bouteilles fluide sur mobile, images optimisées (Storage + miniatures).
- Accessibilité WCAG 2.2 AA, cibles tactiles ≥ 44 px.
- Observabilité : journal des jobs de collecte, taux de succès par source, erreurs remontées.

---

## 13. Migration depuis l'app actuelle

- Exporter toutes les données de l'app Lovable (bouteilles, caves, photos, achats, utilisateurs).
- Script de migration idempotent vers le nouveau schéma, avec rapport (importé / ignoré / à vérifier).
- Période de double fonctionnement possible ; aucune perte de photo ni d'historique.

---

## 14. Phasage proposé

| Lot | Contenu |
|---|---|
| **MVP** | Auth, caves/emplacements, ajout manuel + par lien + recherche IA, fiche bouteille, coût de revient DOM, valorisation simple (prix neuf + adjugés depuis 2–3 sources), tableau de bord, migration des données |
| **V1** | Photo d'étiquette, code-barres, import CSV, historique et graphiques de valeur, alertes, liste d'envies, ventes, PWA hors-ligne |
| **V2** | Toutes les sources du catalogue, matching avancé, comparables, partage/foyer, rapport assurance PDF, notes de dégustation, anglais |

Critères d'acceptation du MVP : ajouter 3 bouteilles (une par mode) en < 1 min chacune ; coût de revient détaillé exact au centime sur 5 cas de test fournis ; valeur de revente affichée avec au moins une source et une date.

---

## 15. Décisions à trancher avant de coder

1. **Territoire de la cave principale** (DOM concerné ou Métropole) et cas réels d'achats à reproduire en tests (avec factures et frais réels).
2. **Stack** : garder Supabase (migration simple) ou repartir de zéro ?
3. **Usage** : personnel/familial uniquement, ou ouverture à d'autres collectionneurs (abonnement) ? Cela change les contraintes CGU des sources de prix et la conformité.
4. **Sources prioritaires** pour le MVP (3 cavistes + 2 maisons d'enchères).
5. **Fréquence de rafraîchissement** des prix et budget mensuel d'appels IA / collecte.
6. Faut-il conserver **exactement** l'interface actuelle ou une refonte visuelle est-elle souhaitée ?
