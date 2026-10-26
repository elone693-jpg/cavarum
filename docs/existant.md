# Cavarum v1 — Inventaire de l'existant

> Rétro-ingénierie de `https://cavarum.lovable.app`, réalisée le 26/10/2026.
> Objectif : ne rien perdre de l'existant lors de la refonte décrite dans [PROMPT-CAVARUM.md](../PROMPT-CAVARUM.md).

## 0. Méthode, sources et limites

| Élément | Valeur |
|---|---|
| Artefact analysé | `assets/index-CO0S68Xe.js` (777 312 octets, bundle Vite unique, **sans source map**), `index.html`, `manifest.json`, `robots.txt` |
| Empreinte REA du dossier analysé | sha256 `76e10d8f9c268c6a9e38ab2a0e44df7ce63b3d17acfb4241e3b7f23ccaa8fa85` |
| Analyse REA | `analyze_javascript_application` — Evidence `ev_a4933b81…` puis `ev_6a9b1267…` (heap 6 Go) |
| Résultat REA | **Couverture partielle** : le worker REA a épuisé sa mémoire sur ce bundle aux deux essais, et aucun graphe exploitable n'a été produit |
| Méthode de repli | Extraction statique du texte du bundle (lecture inerte, code jamais exécuté) : appels Supabase, routes, schémas Zod, libellés d'interface |

**Ce qui est observé** : tout ce que le *front* envoie ou affiche (routes, tables, colonnes lues/écrites, fonctions serveur appelées et leurs paramètres, règles de validation, libellés).

**Ce qui reste inconnu** (code serveur, invisible depuis le navigateur) :
- le code des 6 *edge functions* Supabase, donc les **prompts IA**, les sources réellement interrogées et l'algorithme de valorisation ;
- le schéma SQL exact (types, contraintes, index, triggers) et les **politiques RLS** ;
- le contenu de la base (nombre de rhums au catalogue, nombre de bouteilles).

Pour les obtenir : exporter le projet depuis Lovable (GitHub sync) ou depuis le tableau de bord Supabase (`supabase/functions/*`, `supabase/migrations/*`).

---

## 1. Stack technique observée

- **Front** : React 18 + Vite, React Router, TanStack Query (fiche rhum), Tailwind + shadcn/ui (Radix), Zod (validation), toasts *sonner*, interface 100 % en français.
- **Backend** : Supabase, projet `inwxiyjzhhtwcfagomfj.supabase.co` (Auth, Postgres, Storage, Edge Functions, RPC).
- **IA** : passerelle IA Lovable. Modèles tarifés dans l'écran admin : `openai/gpt-5`, `openai/gpt-5-mini`, `google/gemini-2.5-flash`, `google/gemini-2.5-pro`.
- **Scraping** : Firecrawl (mentionné dans l'écran admin pour Rum-X).
- **PWA** : `manifest.json` (« Cavarum - Maison du Rhum », standalone, portrait, `#1a0f0a`), icône 512 px, splash screen. **Aucun service worker** (`/sw.js` → 404), donc pas de mode hors-ligne.
- Scripts tiers Lovable injectés : `/~flock.js`, `/__l5e/events….js` (analytics de la plateforme).

---

## 2. Routes et écrans

| Route | Écran | Contenu observé |
|---|---|---|
| `/auth` | Connexion / Inscription | Onglets Connexion / Inscription ; email + mot de passe, nom à l'inscription ; « Renvoyer un lien » (confirmation d'email) |
| `/forgot-password` | Mot de passe oublié | `resetPasswordForEmail` |
| `/reset-password` | Nouveau mot de passe | Saisie + confirmation, `updateUser` |
| `/` | Tableau de bord | Accroche « Suivez la valeur, la rareté et l'évolution… » ; 4 indicateurs : **Bouteilles, Valeur totale, Plus-value, Couverture prix** (part des bouteilles ayant un prix marché) ; liste des caves avec valeur, coût et plus-value par cave ; bouton de réévaluation |
| `/cellars` | Mes caves | Liste avec nombre de bouteilles ; création (nom, type *Personnelle/Professionnelle*, emplacement libre « Sous-sol, Garage… ») ; suppression avec avertissement (supprime aussi les bouteilles) |
| `/cellars/:cellarId` | Détail d'une cave | Cartes bouteilles : photo, rhum, statut, achat, valeur, +/- value, prix marché ; **édition en ligne** du prix d'achat et de l'estimation ; ajout/remplacement de photo (≤ 10 Mo) ; suppression ; boutons « Réévaluer » et « **Vérifier les prix sur Excellence Rhum et Rum-X** » |
| `/cellars/add-bottle` | Ajouter à ma cave | Rhum déjà choisi (`?rum_id=`), pré-rempli depuis l'IA (millésime, âge, degré, volume, type, style, n° de fût, batch) ; photo appareil (`capture="environment"`, ≤ 5 Mo) |
| `/cellars/add-bottle-manual` | Saisie manuelle | Formulaire en deux blocs « Le rhum » et « L'achat », validé par Zod, envoyé à l'edge function `create-bottle-manual` |
| `/rums` | Base de rhums | Catalogue partagé (jusqu'à 5 000 lignes chargées côté client), recherche « distillerie, cuvée, pays… », badge Édition limitée |
| `/rums/:rumId` | Fiche rhum | Distillerie, marque, origine, degré, volume, millésime, nombre de bouteilles (édition limitée), **prix de référence marché** avec source et date |
| `/rums/ai-search` | Identifier une bouteille (IA) | Deux modes : **Description** libre ou **Lien URL** ; affiche le quota IA du jour ; liste de candidats (photo, confiance, raisonnement, prix marché estimé) |
| `/rums/create` | Créer un rhum | Ajout direct au catalogue avec autocomplétion sur distilleries et cuvées existantes |
| `/stats` | Statistiques | Répartition **par pays** uniquement (nombre et valeur) |
| `/admin/enrich` | Enrichir la base (admin) | Import du catalogue Excellence Rhum, import basique Rum-X, **scraping Rum-X avancé via Firecrawl** par lots de 100 avec reprise, pause et mode auto ; historique des imports |
| `/admin/ai-usage` | IA Usage (admin) | Utilisateurs, appels, tokens, coût estimé (USD) par utilisateur et par plan ; 50 derniers appels (fonction, modèle, coût, statut) |
| `*` | 404 | « Page introuvable » |

Navigation : Dashboard · Mes caves · Base de rhums · Statistiques · (Admin · IA Usage pour le rôle `admin`) · Déconnexion.

---

## 3. Modèle de données (déduit des requêtes du front)

### `cellars`
`id`, `user_id`, `name`, `type` (`personal` | `professional`), `location`, `created_at`.

### `rums` — catalogue **partagé** entre tous les utilisateurs
`id`, `distillery`*, `cuvee_name`*, `country`*, `region`, `brand` (marque/embouteilleur), `style`, `type`, `vintage`, `age`, `abv`, `volume_ml` (défaut 700), `limited_edition`, `limited_count`, `thumbnail_url`, `market_price`, `market_price_source`, `market_price_updated_at`.
- `style` ∈ `Agricole`, `Traditionnel`, `Melasse`, `Pure Cane`
- `type` ∈ `Brut de fût`, `Single cask`, `Blend`, `Cask strength`, `Standard`

### `bottles` — exemplaires possédés
`id`, `user_id`, `cellar_id`, `rum_id`, `quantity`, `purchase_date`, `purchase_price`, `current_value`, `purchase_place`, `location_text`, `notes`, `status`, `photo_url`, `created_at`.
- `status` ∈ `sealed` (Scellée), `open` (Ouverte), `finished` (Terminée), `sold` (Vendue)
- Le **n° de fût** et le **batch** issus de l'IA ne sont pas stockés en colonnes : ils sont concaténés dans `notes` (« Fût n°… | Batch: … »).

### `valuations_history`
`bottle_id`, `estimated_value` (+ horodatage probable). Écrit lors d'une modification manuelle de l'estimation ; **aucun écran ne l'affiche**.

### `profiles`
`id`, `email`, `name`, `subscription_status`.

### `user_roles`
`user_id`, `role` (au moins `admin`).

### `ai_usage`
`user_id`, `model`, tokens entrée/sortie, fonction appelée, statut, `created_at`.

### RPC `check_ai_quota(_user_id)`
Retourne `used_today`, `daily_limit`, `plan`. Il existe donc un **système de plans avec quota IA journalier**.

### Storage
Bucket **public** `bottle-photos`, chemin `{user_id}/{timestamp}.{ext}` (URL publique enregistrée dans `bottles.photo_url`).

---

## 4. Fonctions serveur (Edge Functions)

| Fonction | Appelée depuis | Entrée | Sortie observée | Rôle déduit |
|---|---|---|---|---|
| `ai-find-bottle` | `/rums/ai-search` | `{description}` ou `{url}` | `candidates[]` ou `result` | Identification par IA (texte ou page produit) ; rapproche d'un rhum existant (`matched_rum_id`) |
| `ai-find-bottle` | idem | `{action:"create_rum", candidate}` | `rum_id` | Crée la fiche catalogue d'un candidat non trouvé |
| `create-bottle-manual` | `/cellars/add-bottle-manual` | rhum + achat (schéma Zod) | `error?` | Crée ou retrouve le rhum puis insère la bouteille |
| `update-bottle-values` | Tableau de bord, détail de cave | — | `bottlesUpdated`, `valueDiff` | Recopie probablement `rums.market_price` dans `bottles.current_value` |
| `refresh-cellar-prices` | Détail de cave | `{cellar_id}` + jeton | `message`, `rumsChecked` | Lance un scraping des prix (Excellence Rhum, Rum-X) pour les rhums de la cave, en asynchrone (rechargement après 30 s) |
| `enrich-rums` | `/admin/enrich` | `{source:"excellence-rhum" \| "rum-x"}` | `enrichedCount`, `errors` | Import en masse du catalogue |
| `scrape-rumx` | `/admin/enrich` | `{action:"start"}` / `{action:"resume", sessionId}` | `sessionId`, `totalUrls`, `processedUrls`, `insertedCount`, `pricesUpdated`, `products[]`, `isComplete` | Scraping Rum-X par lots de 100 avec reprise, via Firecrawl |

**Champs d'un candidat IA** : `distillery`, `cuvee_name`, `brand`, `country`, `region`, `style`, `type`, `vintage`, `age`, `abv`, `volume_ml`, `limited_edition`, `thumbnail_url`, `image_source_url`, `estimated_market_price_eur`, `confidence`, `reasoning`, `matched_rum_id`.

**Sites cités dans l'interface** pour l'ajout par lien : Rhum Attitude, Rhum Caraïbes, La Compagnie du Rhum, Whisky.fr, Excellence Rhum, La Maison du Whisky.

---

## 5. Règles métier observées

- **Valeur d'une cave** = Σ `current_value × quantity` ; **coût** = Σ `purchase_price × quantity` ; plus-value en € et en %.
- **Réévaluation automatique** au plus une fois par 24 h, déclenchée à l'ouverture du tableau de bord. La date est stockée dans le `localStorage` du navigateur, donc la règle s'applique **par appareil** et non par compte.
- À l'ajout d'une bouteille, `current_value` prend par défaut le prix marché du rhum, sinon le prix d'achat.
- Une seule valeur par bouteille (`current_value`) : **pas de distinction entre valeur d'achat (neuf) et valeur de revente**.
- **Aucun calcul de taxes, de transport ni de frais** : les termes octroi de mer, TVA, frais et douane sont absents du bundle. Le coût de revient « rendu cave » demandé est **entièrement nouveau**.
- Une seule devise, l'EUR (format `fr-FR`).
- Validation manuelle : millésime 1800–2100, âge 0–200, degré 0–100, volume 10–10 000 ml, prix 0–1 000 000, quantité 1–1 000, notes ≤ 2 000 caractères.
- Suppression d'une cave → suppression de ses bouteilles (après confirmation).
- Une cave par défaut est créée automatiquement si l'utilisateur n'en a aucune (message affiché sur le tableau de bord).

---

## 6. Points d'attention pour la refonte

1. **Sécurité à vérifier côté serveur (RLS)**
   - Le rôle admin n'est vérifié que dans le front : l'accès aux tables `ai_usage` et `profiles` doit être restreint par RLS.
   - N'importe quel utilisateur connecté peut écrire `rums.insert` dans le catalogue partagé : il faut décider si c'est voulu.
   - Le bucket `bottle-photos` est public : toute personne ayant l'URL voit les photos.
2. **Fonctionnalités à conserver** : identification IA (texte et URL) avec candidats et confiance, quotas IA par plan, suivi des coûts IA (admin), scraping Rum-X avec reprise, édition rapide prix et estimation, photos.
3. **Manques confirmés par rapport au nouveau prompt**
   - Coût de revient DOM ;
   - valeur de revente distincte de la valeur d'achat ;
   - courbes d'historique ;
   - emplacements structurés (texte libre aujourd'hui) ;
   - n° de fût et de bouteille en champs dédiés ;
   - photo d'étiquette et code-barres, import CSV ;
   - exports, alertes, hors-ligne ;
   - statistiques au-delà du pays ;
   - liste d'envies, ventes détaillées, notes de dégustation.
4. **Dette technique**
   - Chargement de tout le catalogue et de toutes les bouteilles côté client (`limit(5000)`) ;
   - aucune pagination ;
   - planification par `localStorage` plutôt que par une tâche serveur.
5. **Migration** : les tables `cellars`, `bottles`, `rums`, `valuations_history`, `profiles`, `user_roles`, `ai_usage` et le bucket `bottle-photos` sont à reprendre. Il faut extraire `Fût n°` et `Batch` du champ `notes` vers des colonnes dédiées.

---

## 7. Reste à faire pour un inventaire complet

| Question | Statut | Comment la clore |
|---|---|---|
| Écrans, routes, tables, fonctions appelées | **Répondu** (extraction statique) | — |
| Prompts IA, sources et algorithme de prix | **Non résolu** (code serveur) | Exporter `supabase/functions/` depuis Lovable/GitHub ou Supabase |
| Schéma SQL exact, RLS, triggers | **Partiel** (colonnes déduites du front) | Exporter `supabase/migrations/` ou un dump du schéma |
| Volume de données réel | **Non résolu** | Requêtes de comptage sur la base, ou parcours de l'app connectée |
| Comportement à l'exécution (réponses réelles des fonctions) | **Non observé** | Session navigateur connectée + capture réseau REA (`capture_browser_scenario`) |
