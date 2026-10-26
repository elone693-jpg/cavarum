// Données v1 telles que lues depuis l'app Lovable (voir docs/existant.md §3).

export type V1Cellar = {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  location: string | null;
  created_at: string | null;
};

export type V1Rum = {
  id: string;
  distillery: string | null;
  cuvee_name: string | null;
  country: string | null;
  region: string | null;
  brand: string | null;
  style: string | null;
  type: string | null;
  vintage: number | null;
  age: number | null;
  abv: number | string | null;
  volume_ml: number | null;
  limited_edition: boolean | null;
  limited_count: number | null;
  thumbnail_url: string | null;
};

export type V1Bottle = {
  id: string;
  user_id: string;
  cellar_id: string;
  rum_id: string;
  quantity: number | null;
  purchase_date: string | null;
  purchase_price: number | string | null;
  current_value: number | string | null;
  purchase_place: string | null;
  location_text: string | null;
  notes: string | null;
  status: string | null;
  photo_url: string | null;
  created_at: string | null;
};

export type V1Valuation = {
  id?: string | null;
  bottle_id: string;
  estimated_value: number | string | null;
  created_at?: string | null;
};

export type V1Snapshot = {
  extracted_at: string;
  cellars: V1Cellar[];
  rums: V1Rum[];
  bottles: V1Bottle[];
  valuations: V1Valuation[];
  /** Tables que les règles d'accès v1 ont refusé de lire. */
  unreadable_tables: string[];
};

// Lignes v2 à écrire. Les références entre lignes passent par les legacy_id :
// le chargement les résout en identifiants v2.

export type MigrationStatus = 'imported' | 'skipped' | 'to_review';

export type ReportItem = {
  entity: 'cellar' | 'rum' | 'bottle' | 'purchase' | 'valuation' | 'photo';
  legacy_id: string;
  status: MigrationStatus;
  message?: string;
};

export type CellarRow = {
  legacy_id: string;
  name: string;
  type: 'personal' | 'professional';
  location: string | null;
};

export type RumRow = {
  legacy_id: string;
  distillery: string;
  cuvee_name: string;
  country: string;
  region: string | null;
  brand: string | null;
  style: 'agricole' | 'traditionnel' | 'melasse' | 'pure_cane' | null;
  type: 'brut_de_fut' | 'single_cask' | 'blend' | 'cask_strength' | 'standard' | null;
  vintage: number | null;
  age: number | null;
  abv: string | null;
  volume_ml: number;
  limited_edition: boolean;
  limited_count: number | null;
  thumbnail_url: string | null;
};

export type BottleRow = {
  legacy_id: string;
  cellar_legacy_id: string;
  rum_legacy_id: string;
  status: BottleStatus;
  quantity: number;
  cask_number: string | null;
  batch: string | null;
  location_text: string | null;
  notes: string | null;
};

export type BottleStatus =
  | 'ordered'
  | 'in_transit'
  | 'in_cellar'
  | 'open'
  | 'empty'
  | 'sold'
  | 'gifted'
  | 'exchanged'
  | 'lost';

export type PurchaseRow = {
  legacy_id: string;
  bottle_legacy_id: string;
  purchased_on: string | null;
  seller: string | null;
  unit_price: string | null;
  currency: 'EUR';
};

export type ValuationRow = {
  legacy_id: string;
  bottle_legacy_id: string;
  value: string;
  kind: 'manual' | 'legacy';
  source: string;
  valued_at: string;
};

export type PhotoRow = {
  legacy_id: string;
  bottle_legacy_id: string;
  source_url: string;
  /** Chemin relatif au dossier de l'utilisateur dans le bucket privé. */
  relative_path: string;
};

export type MigrationPlan = {
  cellars: CellarRow[];
  rums: RumRow[];
  bottles: BottleRow[];
  purchases: PurchaseRow[];
  valuations: ValuationRow[];
  photos: PhotoRow[];
  report: ReportItem[];
};
