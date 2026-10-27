# Cavarum v2

Application mobile (PWA) de gestion de cave à rhum : ce que la cave a coûté, ce qu'elle vaut.

- Vision et périmètre : [PROMPT-CAVARUM.md](PROMPT-CAVARUM.md) · [PRD](.claude/prds/cavarum-v2.prd.md)
- Inventaire de la v1 Lovable : [docs/existant.md](docs/existant.md)
- Plan du jalon en cours : [.claude/plans/cavarum-v2-jalon-1-socle-migration.plan.md](.claude/plans/cavarum-v2-jalon-1-socle-migration.plan.md)

## Stack

React 18 + TypeScript + Vite · Tailwind · TanStack Query · Supabase (Postgres, Auth, Storage) · Vitest · Playwright.

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs
```

## Base de données

Les migrations sont dans `supabase/migrations/` :

| Fichier | Contenu |
|---|---|
| `0001_schema.sql` | Tables, énumérations, contraintes (montants en `numeric(12,2)`) |
| `0002_rls.sql` | Règles d'accès : chacun ne voit que ses données, rôle admin vérifié côté serveur |
| `0003_storage.sql` | Buckets **privés** `bottle-photos` et `invoices`, cloisonnés par dossier utilisateur |
| `0004_views.sql` | `cellar_summaries` : totaux par cave calculés en base |
| `0005_account.sql` | `delete_my_account()` : suppression du compte et de toutes ses données (RGPD) |
| `0006_collection_summary.sql` | `collection_summary` : synthèse de la collection (caves, bouteilles, coût) |

Pour les appliquer à un projet Supabase hébergé (CLI Supabase requise) :

```bash
npx supabase link --project-ref <ref-du-projet-v2>
npx supabase db push
```

En local, `npx supabase start` nécessite Docker.

Les tests du schéma n'ont **pas** besoin de Docker. Ils exécutent les migrations dans PGlite (Postgres en WebAssembly), avec une reproduction minimale des rôles, de `auth` et de `storage` (`supabase/tests/supabase-stub.sql`). Ils vérifient le cloisonnement réel en se connectant sous le rôle `authenticated`.

## Commandes

```bash
npm run dev          # serveur de développement
npm run test         # tests unitaires, SQL et de migration
npm run typecheck
npm run lint
npm run build
npm run test:e2e     # parcours navigateur (voir ci-dessous)
```

## Migration depuis la v1 (Lovable)

Le script lit **vos** données v1 avec votre compte. Aucun accès administrateur n'est nécessaire. Il écrit ensuite dans la v2 avec votre compte v2.

1. Créez votre compte dans la v2 (inscription dans l'app).
2. Renseignez dans `.env` les variables `V1_*` et `V2_*`. La clé anon v1 se trouve dans Lovable → Supabase → API.
3. Passage à blanc : il lit la v1, sauvegarde un instantané JSON et produit le rapport, sans rien écrire :
   ```bash
   npm run migrate:v1 -- --dry-run
   ```
4. Migration réelle, rejouable sans doublon grâce aux colonnes `legacy_id` :
   ```bash
   npm run migrate:v1
   ```
5. Relisez `migration-output/rapport-migration-*.md`, qui liste les éléments **ignorés** et **à vérifier**.

Pour rejouer depuis un instantané sans relire la v1 :

```bash
npm run migrate:v1 -- --from-snapshot migration-output/snapshot-v1-<date>.json
```

Ce que fait la transformation :
- **Statuts** : `sealed` → en cave, `open` → ouverte, `finished` → vide, `sold` → vendue.
- **N° de fût et batch** : la ligne « Fût n°… | Batch: … » ajoutée par l'IA v1 est extraite des notes vers des champs dédiés.
- **Achats** : prix, date et lieu d'achat deviennent un enregistrement `purchases`. Un prix à 0 € est signalé à vérifier.
- **Estimations** : la valeur actuelle v1 devient une estimation `legacy`, et l'historique v1 des estimations manuelles est repris.
- **Photos** : elles sont copiées dans le bucket privé. Une photo inaccessible est signalée, sans bloquer la migration.
- **Rhums en double** dans le catalogue v1 : ils sont fusionnés, sauf si le millésime, le degré ou la contenance diffèrent.

**Retour arrière** : la v1 n'est jamais modifiée. Pour recommencer, supprimez vos caves v2 (les bouteilles, achats, photos et estimations suivent en cascade), puis relancez.

`migration-output/` contient vos données personnelles. Ce dossier est exclu de git.

## Tests de bout en bout

`npm run test:e2e` démarre l'app et vérifie la redirection des visiteurs non connectés.

Le parcours complet (connexion → caves → bouteille migrée) nécessite un compte v2 migré :

```bash
E2E_EMAIL=… E2E_PASSWORD=… E2E_EXPECT_CASK=7 E2E_EXPECT_PHOTO=1 npm run test:e2e
```

## Design et icône

- **Système de design** : jetons dans `src/index.css` (espresso, or des étiquettes, vert canne, bleu ardoise), composants partagés dans `src/components/ui/` (`PageHeader`, `StatGrid`, `Skeleton`, `EmptyState`, `ErrorState`, `Section`). Titres en Cormorant Garamond, données en Inter à chiffres tabulaires.
- **Aperçu sans base de données** : `npm run dev` puis ouvrir `/preview.html?route=/cellars` (routes : `/auth`, `/cellars`, `/cellars/c-1`, `/bottles/b-1`, `/account`; états : `&state=empty|loading|error`). Cette page n'est pas incluse dans le build.
- **Captures de référence** : `npm run design:screenshots` régénère `docs/design/*.png` en 390×844 et 1440×900 ; le relevé de preuves `docs/design/evidence.json` est validé par le skill ECC `frontend-design-direction`.
- **Icône** : source unique `public/icon.svg` (bouteille de rhum sous voûte de chai). `npm run icons` génère favicon, icônes PWA (192, 512, maskable), icône Apple (180) et, pour le bureau macOS, `assets/brand/Cavarum.icns` et `assets/brand/icon-1024.png`.

**Installer Cavarum sur le bureau** (une fois l'app déployée) : dans Chrome ou Edge, menu ⋮ → « Installer Cavarum » ; sur Mac avec Safari, Fichier → « Ajouter au Dock » ; sur iPhone, Partager → « Sur l’écran d’accueil ». L'icône du manifest est utilisée automatiquement.

## Publication (GitHub Pages, comme AgenceManager)

L'app est publiée sur **https://elone693-jpg.github.io/cavarum/** par le workflow `.github/workflows/deploy.yml`, à chaque push sur `main`.

1. Dans le projet Supabase v2 : appliquer les migrations (`npx supabase db push`). Dans Authentication → URL Configuration, mettre `https://elone693-jpg.github.io/cavarum/` en Site URL et ajouter `https://elone693-jpg.github.io/cavarum/reset-password` aux Redirect URLs.
2. Dans le dépôt GitHub → Settings → Secrets and variables → Actions → **Variables** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. La clé anon est publique par conception : la sécurité repose sur la RLS.
3. Settings → Pages → Source : **GitHub Actions**.

Le build sous `/cavarum/` (`BASE_PATH=/cavarum/`) produit un `404.html`, copie de l'app, pour que les liens directs et les liens reçus par email fonctionnent. GitHub Pages n'applique pas le fichier `_headers` : la CSP reste active via la balise `<meta>`, mais l'interdiction d'affichage dans un cadre (`frame-ancestors`, `X-Frame-Options`) nécessite un hébergeur qui accepte les en-têtes (Netlify, Cloudflare Pages).

**Lanceur Mac** : `npm run launcher` crée `~/Desktop/Cavarum.app`, une petite application avec l'icône Cavarum qui ouvre l'app en ligne dans Safari (même principe que `AgenceManager.app`). `npm run launcher -- /Applications` l'installe dans le dossier Applications.

## Mise en production

Le dépôt fournit le nécessaire pour un déploiement conforme. Certains points dépendent de vous.

| Sujet | Ce que fait le dépôt | Ce qu'il reste à faire |
|---|---|---|
| En-têtes HTTP | `npm run build` produit `dist/_headers` : CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, cache long des assets. La CSP est aussi injectée en `<meta>` dans `index.html`. | `_headers` est lu tel quel par Netlify et Cloudflare Pages. Sur un autre hébergeur (Vercel, Nginx…), reprenez les mêmes valeurs dans sa configuration. |
| Configuration | Le build échoue si `VITE_SUPABASE_URL` manque. L'app affiche un écran clair si la configuration est incomplète. | Définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` chez l'hébergeur. |
| Mentions légales et confidentialité | Pages `/mentions-legales` et `/confidentialite`, liées depuis chaque écran. | **Compléter `src/features/legal/legal-info.ts`** : éditeur, adresse, contact, directeur de publication, hébergeur, région Supabase (UE recommandée). |
| RGPD | Export JSON des données et suppression du compte depuis « Mon compte » (`delete_my_account`, migration `0005`). Aucun traceur, polices auto-hébergées. | — |
| Mots de passe | 12 caractères minimum (recommandation CNIL) dans l'app et dans `supabase/config.toml`. | Appliquer le même minimum dans Supabase → Authentication → Policies pour le projet hébergé. |
| Suivi des erreurs | `ErrorBoundary` affiche un écran de secours et journalise l'erreur. | Brancher un service de suivi (Sentry, etc.) dans `componentDidCatch` si souhaité ; le déclarer alors dans la politique de confidentialité. |
| Anti-robots | Limitation de débit native de Supabase Auth. | Pour une ouverture au public : activer un CAPTCHA (hCaptcha ou Turnstile) dans Supabase Auth. |
| Intégration continue | `.github/workflows/ci.yml` : audit des dépendances, typecheck, lint, tests, build, E2E. | Pousser le dépôt sur GitHub. |

Vérifié en local sur le build de production : Lighthouse mobile **100** en accessibilité, bonnes pratiques et SEO. LCP de 1,95 s en 4G lente avec CPU ralenti, CLS de 0. `npm audit` : 0 vulnérabilité.

## Conventions (établies au jalon 1)

| Sujet | Règle |
|---|---|
| Nommage | Composants `PascalCase.tsx`, modules `kebab-case.ts`, SQL en `snake_case` anglais, interface en français |
| Données | Un module `*-api.ts` par fonctionnalité ; toute erreur Supabase devient une `Error` (`raise`) affichée à l'utilisateur ; rien n'est avalé en silence |
| Sécurité | Toute règle d'accès est portée par la RLS et couverte par `supabase/tests/rls.test.ts` |
| Argent | `numeric(12,2)` en base, chaînes décimales côté client, calculs en SQL, jamais en flottant |
| Tests | Vitest + Testing Library (écrans, API mockée), PGlite (SQL), Playwright (parcours) ; test écrit avant le code |
