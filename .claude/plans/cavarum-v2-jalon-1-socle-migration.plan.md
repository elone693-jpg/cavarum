# Plan : Cavarum v2 — Jalon 1 « Socle et migration »

**PRD source** : `.claude/prds/cavarum-v2.prd.md`
**Jalon retenu** : 1 — Socle et migration
**Complexité** : Large

## Résumé

On monte le socle de la v2 :
- l'application installable ;
- l'authentification avec contrôle d'âge ;
- le nouveau modèle de données, sécurisé côté serveur ;
- trois écrans en consultation : mes caves, détail d'une cave, fiche bouteille ;
- un script de migration rejouable qui reprend toutes les caves, bouteilles, rhums, historiques et photos de la v1.

**Résultat attendu** : je me connecte à la v2 et je retrouve 100 % de ma cave v1, avec un rapport de migration.

## Décisions prises par défaut (à valider avec ce plan)

Le PRD laisse ces points ouverts. Le plan avance avec des choix réversibles :

| Décision | Choix par défaut | Raison | Alternative |
|---|---|---|---|
| Socle technique | Nouveau projet **Supabase** (Postgres, Auth, Storage) + **React + TypeScript + Vite**, Tailwind + shadcn/ui, PWA | Même famille que la v1 : migration et reprise des fonctions IA simplifiées | Repartir sur une autre stack (Next.js, etc.) → seules les tâches 1, 2 et 5 changent |
| Accès aux données v1 | Le script se connecte **avec votre compte v1** (email et mot de passe fournis par variable d'environnement, jamais écrits dans le code) et lit vos données via l'API publique | Aucun accès administrateur requis ; les règles RLS v1 vous laissent lire vos propres lignes | Export SQL depuis le tableau de bord Supabase v1, si vous y avez accès |
| Territoire de résidence | Champ de profil, **sans valeur par défaut imposée** | Le calcul fiscal arrive au jalon 3 ; ici on prépare seulement la donnée | — |
| Identité visuelle | Reprise des couleurs v1 (`#1a0f0a`, `#d4a04a`), du splash et du manifest | Pas de rupture visuelle tant que la question reste ouverte | Refonte plus tard |
| Montants | Stockés en `numeric(12,2)` + devise ; aucun calcul en virgule flottante côté client | Exigence d'exactitude au centime (PRD) | — |

## Patterns à reproduire

Le dépôt ne contient **aucun code** (uniquement `PROMPT-CAVARUM.md`, `docs/existant.md` et le PRD). Il n'y a pas de convention locale à reproduire. Les conventions ci-dessous sont **établies par ce jalon** et serviront de référence aux suivants.

| Catégorie | Source | Convention |
|---|---|---|
| Nommage | à créer | Fichiers composants en `PascalCase.tsx`, modules en `kebab-case.ts`, tables et colonnes SQL en `snake_case` anglais (continuité avec la v1), libellés d'interface en français |
| Erreurs | à créer | Accès aux données via des fonctions qui retournent `{ data, error }` typés ; message utilisateur en français par toast ; aucune erreur avalée en silence |
| Accès aux données | v1 (`docs/existant.md` §3) | Client Supabase unique ; sécurité portée par **RLS côté serveur**, jamais par le seul front |
| Tests | à créer | Vitest pour la logique (migration, transformations), pgTAP pour les règles RLS, Playwright pour les parcours |

## Modèle de données v2 (périmètre jalon 1)

Seules les tables nécessaires au jalon sont créées. Les colonnes réservées aux jalons suivants (coût rendu cave, valorisations) ne sont **pas** créées maintenant.

| Table | Contenu | Évolution par rapport à la v1 |
|---|---|---|
| `profiles` | nom, email, date de confirmation 18+, territoire de résidence, devise d'affichage | + contrôle d'âge, + territoire |
| `user_roles` | rôle (`admin`) | identique |
| `cellars` | nom, type, description du lieu | identique + `legacy_id` |
| `storage_locations` | cave → meuble → rangée → position (arborescence) | **nouveau** (texte libre en v1) |
| `rums` (catalogue) | distillerie, cuvée, marque, **embouteilleur**, pays, région, catégorie, style, type, millésime, âge, degré, contenance, édition limitée, nombre produit, EAN, vignette | + embouteilleur, + EAN ; création réservée aux utilisateurs authentifiés et tracée (`created_by`) |
| `bottles` (exemplaires) | rhum, cave, emplacement, statut, quantité, **n° de fût**, **batch**, **n° de bouteille**, état (étiquette, niveau, coffret), notes, photos | + champs dédiés, + statuts étendus, + `legacy_id` |
| `bottle_photos` | chemin dans un stockage **privé**, ordre | photos multiples, bucket non public |
| `purchases` | exemplaire, date, lieu/vendeur, prix, devise, frais de port (optionnel), facture jointe | **nouveau** : sort l'achat de la bouteille (préparation du jalon 3) |
| `valuations_history` | exemplaire, valeur, type (`manual` / `legacy`), source, date | + type et source |
| `ai_usage` | identique à la v1 | reprise pour l'admin |
| `migration_runs` / `migration_items` | rapport de migration (importé / ignoré / à vérifier) | **nouveau** |

**Correspondance des statuts v1 → v2** : `sealed` → en cave (scellée) · `open` → ouverte · `finished` → vide · `sold` → vendue.

## Fichiers à créer

| Fichier / zone | Action | Pourquoi |
|---|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.example` | CREATE | Socle du projet, scripts `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e` |
| `public/manifest.json`, `public/app-icon.png`, `public/splash.png`, `index.html` | CREATE | PWA et identité visuelle reprises de la v1 |
| `supabase/config.toml` | CREATE | Projet Supabase local |
| `supabase/migrations/0001_schema.sql` | CREATE | Tables, énumérations, contraintes, index |
| `supabase/migrations/0002_rls.sql` | CREATE | Règles d'accès : chacun ne voit que ses données ; catalogue lisible par tous les authentifiés ; admin vérifié côté serveur |
| `supabase/migrations/0003_storage.sql` | CREATE | Buckets privés `bottle-photos` et `invoices` avec règles par utilisateur |
| `supabase/tests/rls.test.sql` | CREATE | Tests pgTAP des règles d'accès |
| `src/lib/supabase.ts`, `src/lib/database.types.ts` | CREATE | Client unique et types générés du schéma |
| `src/features/auth/*` | CREATE | Connexion, inscription avec confirmation 18+, mot de passe oublié/réinitialisation, garde de routes |
| `src/features/cellars/*` | CREATE | Liste des caves avec totaux simples (nombre de bouteilles, coût d'achat), création, renommage, suppression |
| `src/features/bottles/*` | CREATE | Détail d'une cave (liste filtrable par statut), fiche bouteille en lecture avec photos (URLs signées) |
| `src/app/routes.tsx`, `src/app/Layout.tsx` | CREATE | Navigation (Caves, Catalogue, Admin si rôle) |
| `scripts/migrate-v1/extract.ts` | CREATE | Lecture des données v1 de l'utilisateur via son compte (pagination, aucune limite de 5 000) |
| `scripts/migrate-v1/transform.ts` | CREATE | Correspondance des statuts, extraction de `Fût n°` et `Batch` depuis les notes, rapprochement des rhums, création des achats et de l'historique |
| `scripts/migrate-v1/load.ts` | CREATE | Écriture idempotente dans la v2 (clé `legacy_id`), copie des photos vers le bucket privé |
| `scripts/migrate-v1/report.ts` | CREATE | Rapport : importé / ignoré / à vérifier, avec comptes et écarts |
| `scripts/migrate-v1/*.test.ts` | CREATE | Tests unitaires des transformations |
| `e2e/socle.spec.ts` | CREATE | Parcours connexion → caves → fiche bouteille |
| `README.md` | CREATE | Installation, variables d'environnement, lancement de la migration |

## Tâches

### Tâche 1 : Initialiser le projet front
- **Action** : créer le projet React + TypeScript + Vite en mode strict, avec Tailwind, shadcn/ui, le routeur, ESLint et Vitest. Reprendre le manifest, l'icône, le splash et les couleurs v1. Mettre en place un service worker minimal (installabilité uniquement ; le hors-ligne viendra au jalon 5).
- **Mirror** : identité visuelle v1 (`docs/existant.md` §1).
- **Validate** : `npm run typecheck && npm run lint && npm run build` ; l'app est installable sur mobile (audit Lighthouse PWA).

### Tâche 2 : Créer le schéma v2
- **Action** : écrire `0001_schema.sql` avec les tables du tableau ci-dessus :
  - contraintes : degré 0–100, millésime 1800–2100, quantité ≥ 1, montants `numeric(12,2)` ≥ 0 ;
  - énumérations : statuts, style, type ;
  - index sur `user_id`, `cellar_id`, `rum_id` ;
  - colonnes `legacy_id` uniques.
- **Mirror** : colonnes v1 (`docs/existant.md` §3) pour garder la continuité des noms.
- **Validate** : `supabase db reset` passe sans erreur, puis `supabase gen types typescript --local` produit les types.

### Tâche 3 : Sécuriser l'accès (RLS) et le stockage
- **Action** : écrire `0002_rls.sql` et `0003_storage.sql` :
  - chaque table utilisateur est filtrée sur `auth.uid()` ;
  - le catalogue est en lecture pour les authentifiés, création tracée ;
  - `ai_usage` et `profiles` des autres utilisateurs ne sont visibles que pour le rôle admin, via une fonction `is_admin()` côté serveur ;
  - les buckets sont privés et cloisonnés par dossier `{user_id}/`.
- **Mirror** : correction des failles listées dans `docs/existant.md` §6.1.
- **Validate** : `supabase test db`. Les tests pgTAP prouvent qu'un utilisateur A ne lit ni n'écrit les données de B, et qu'un non-admin ne lit pas `ai_usage`.

### Tâche 4 : Authentification et contrôle d'âge
- **Action** : écrans connexion, inscription, mot de passe oublié et réinitialisation, en français.
  - Case « J'ai 18 ans ou plus », obligatoire et enregistrée avec la date dans `profiles`.
  - Mention « L'abus d'alcool est dangereux pour la santé ».
  - Routes protégées.
- **Mirror** : parcours v1 (`/auth`, `/forgot-password`, `/reset-password`).
- **Validate** : tests Vitest des formulaires et test Playwright « inscription → confirmation → connexion → déconnexion ».

### Tâche 5 : Écrans caves et bouteilles (consultation)
- **Action** :
  - liste des caves : nom, lieu, nombre de bouteilles, coût d'achat total ; création, renommage, suppression avec confirmation ;
  - détail d'une cave : bouteilles avec photo, statut, quantité, filtre par statut ;
  - fiche bouteille : rhum, exemplaire, achat, photos, historique des estimations reprises de la v1.
  - Les requêtes sont paginées ; aucun chargement massif.
- **Mirror** : écrans v1 `/cellars` et `/cellars/:cellarId`, sans l'édition des valeurs (jalon 4).
- **Validate** : tests de composants Vitest ; Playwright sur une cave de démonstration.

### Tâche 6 : Script de migration — extraction
- **Action** :
  - se connecter à la v1 avec les identifiants fournis par variables d'environnement (`V1_EMAIL`, `V1_PASSWORD`, jamais commités) ;
  - lire de façon paginée `cellars`, `bottles` (avec `rums`) et `valuations_history` ;
  - télécharger les photos depuis leurs URLs publiques ;
  - écrire un instantané JSON horodaté, hors du dépôt, qui sert de sauvegarde.
- **Mirror** : requêtes v1 observées (`docs/existant.md` §3).
- **Validate** : exécution à blanc (`--dry-run`) qui affiche les comptes par table sans rien écrire.

### Tâche 7 : Script de migration — transformation
- **Action** : fonctions pures, testées :
  - correspondance des statuts ;
  - extraction de `Fût n°…` et `Batch: …` depuis `notes`, en conservant le reste des notes ;
  - création d'un `purchase` depuis `purchase_price`, `purchase_date` et `purchase_place` ;
  - `current_value` v1 transformée en entrée `valuations_history` de type `legacy` ;
  - `location_text` conservé en texte libre, et rattaché à un emplacement quand la correspondance est sûre ;
  - rhums v1 dédoublonnés (distillerie + cuvée + millésime + degré + contenance) ;
  - tout cas ambigu marqué « à vérifier ».
- **Mirror** : règles métier v1 (`docs/existant.md` §5).
- **Validate** : `npm run test -- scripts/migrate-v1`, avec au moins un cas par règle, y compris les notes vides, sans fût et avec fût + batch.

### Tâche 8 : Script de migration — chargement et rapport
- **Action** :
  - écriture dans la v2 par lots, idempotente : une relance ne crée aucun doublon grâce à `legacy_id` ;
  - copie des photos dans le bucket privé ;
  - enregistrement de `migration_runs` et `migration_items` ;
  - rapport final en Markdown : importé / ignoré / à vérifier, avec les comptes v1 et v2 comparés.
- **Mirror** : conventions d'erreurs de ce jalon : chaque échec est listé dans le rapport, jamais ignoré.
- **Validate** :
  - migration sur une base locale depuis l'instantané, rejouée deux fois : comptes identiques et zéro doublon ;
  - comptes v2 = comptes v1 pour les caves, les bouteilles (somme des quantités) et les photos.

### Tâche 9 : Parcours de bout en bout et documentation
- **Action** : test Playwright « connexion → je retrouve mes caves → j'ouvre une bouteille migrée et je vois sa photo et son n° de fût ». README : installation, variables d'environnement, procédure de migration et de retour arrière.
- **Mirror** : critère d'acceptation du jalon 1 du PRD.
- **Validate** : `npm run test:e2e` au vert.

## Ordre et dépendances

```
1 Projet front ─┐
2 Schéma ───────┼─> 3 RLS/Storage ─> 4 Auth ─> 5 Écrans ─┐
                └─> 6 Extraction ─> 7 Transformation ─> 8 Chargement ─┴─> 9 E2E + doc
```

Les tâches 6 et 7 peuvent avancer en parallèle des tâches 3 à 5, une fois le schéma (tâche 2) en place.

## Validation

```bash
npm run typecheck
npm run lint
npm run test
supabase db reset
supabase test db
npm run migrate:v1 -- --dry-run
npm run test:e2e
npm run build
```

## Risques

| Risque | Probabilité | Atténuation |
|---|---|---|
| Les règles RLS v1 empêchent de lire certaines données avec le compte utilisateur (ex. `valuations_history`) | Moyenne | Le dry-run détecte les tables vides ou refusées ; repli sur un export SQL depuis le tableau de bord Supabase v1 |
| Rhums v1 en doublon ou incomplets dans le catalogue partagé | Élevée | Rapprochement conservateur, sinon « à vérifier » dans le rapport ; aucune fusion automatique incertaine |
| Photos v1 inaccessibles (URL cassée, fichier supprimé) | Faible | Listées dans le rapport, la migration continue |
| Format des notes v1 irrégulier (fût, batch) | Moyenne | Extraction tolérante, texte d'origine conservé intégralement, cas non reconnus à vérifier |
| Choix de stack contesté après le démarrage | Faible | Validé avec ce plan avant tout code ; le schéma SQL et le script de migration restent réutilisables |
| Identifiants v1 exposés | Faible | Uniquement en variables d'environnement, `.env` ignoré par git, instantané stocké hors du dépôt |

## Écarts par rapport au plan (implémentation du 26/10/2026)

- **pgTAP remplacé par PGlite** : ni Docker ni Supabase CLI ne sont installés sur la machine. Les migrations SQL et les règles RLS sont exécutées dans PGlite (vrai Postgres en WebAssembly) avec une reproduction minimale des rôles, de `auth` et de `storage` (`supabase/tests/supabase-stub.sql`). La couverture est identique ; seule la validation sur une vraie instance Supabase reste à faire.
- **Ajout de `0004_views.sql`** (`cellar_summaries`) : les totaux par cave sont calculés en base pour qu'aucun calcul monétaire ne soit fait dans le navigateur.
- **Types Supabase non générés** : `supabase gen types` nécessite la CLI ; les types de données sont déclarés dans chaque `*-api.ts`. À générer quand le projet v2 existera.
- **Emplacements structurés** : la table `storage_locations` existe et est protégée, mais aucun écran ne la gère encore. Le texte libre v1 est conservé dans `location_text`.

## Acceptation

- [x] Toutes les tâches terminées (code et tests)
- [x] Validation au vert : typecheck, lint, 106 tests (unitaires, SQL/RLS, migration, écrans), build, E2E sans compte
- [ ] Migration réelle effectuée : nécessite le projet Supabase v2 et vos identifiants v1/v2
- [ ] E2E « bouteille migrée » : nécessite un compte v2 migré (`E2E_EMAIL`, `E2E_PASSWORD`)
- [x] Un utilisateur ne peut ni lire ni modifier les données d'un autre (tests RLS sur PGlite)
- [x] Conventions établies par ce jalon documentées dans le README pour les jalons suivants
