// Transformation pure des données v1 en lignes v2 (aucun accès réseau ni base).
import type {
  BottleRow,
  BottleStatus,
  CellarRow,
  MigrationPlan,
  PhotoRow,
  PurchaseRow,
  ReportItem,
  RumRow,
  V1Rum,
  V1Snapshot,
  ValuationRow,
} from './types';

/** Convertit un montant en chaîne au centime, arrondi au demi-centime supérieur, sans flottant. */
export function toMoney(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  let text = typeof value === 'number' ? String(value) : value.trim();
  if (typeof value === 'number' && text.includes('e')) text = value.toFixed(6);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const fraction = (match[2] ?? '').padEnd(3, '0');
  let cents = BigInt(match[1]!) * 100n + BigInt(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) cents += 1n;
  const euros = cents / 100n;
  const rest = (cents % 100n).toString().padStart(2, '0');
  return `${euros}.${rest}`;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const STATUS_MAP: Record<string, BottleStatus> = {
  sealed: 'in_cellar',
  open: 'open',
  finished: 'empty',
  sold: 'sold',
};

export function mapStatus(status: string | null): { status: BottleStatus; review?: string } {
  if (!status) return { status: 'in_cellar' };
  const mapped = STATUS_MAP[status];
  return mapped ? { status: mapped } : { status: 'in_cellar', review: `Statut v1 inconnu : « ${status} »` };
}

const STYLE_MAP: Record<string, NonNullable<RumRow['style']>> = {
  agricole: 'agricole',
  traditionnel: 'traditionnel',
  melasse: 'melasse',
  'pure cane': 'pure_cane',
};

const TYPE_MAP: Record<string, NonNullable<RumRow['type']>> = {
  'brut de fut': 'brut_de_fut',
  'single cask': 'single_cask',
  blend: 'blend',
  'cask strength': 'cask_strength',
  standard: 'standard',
};

/** null = absent ; undefined = valeur v1 non reconnue. */
export function mapStyle(style: string | null): RumRow['style'] | undefined {
  if (!style?.trim()) return null;
  return STYLE_MAP[normalize(style)];
}

/** null = absent ; undefined = valeur v1 non reconnue. */
export function mapType(type: string | null): RumRow['type'] | undefined {
  if (!type?.trim()) return null;
  return TYPE_MAP[normalize(type)];
}

const CASK_SEGMENT = /^Fût n°\s*(.+)$/;
const BATCH_SEGMENT = /^Batch:\s*(.+)$/;

/**
 * La v1 ajoutait « Fût n°X | Batch: Y » sur une ligne à la fin des notes.
 * Seules les lignes composées exclusivement de ces segments sont extraites.
 */
export function parseNotes(notes: string | null): { notes: string | null; cask_number: string | null; batch: string | null } {
  let caskNumber: string | null = null;
  let batch: string | null = null;
  const kept: string[] = [];

  for (const line of (notes ?? '').split('\n')) {
    const segments = line.split(' | ').map((s) => s.trim());
    const parsed = segments.map((s) => ({ cask: CASK_SEGMENT.exec(s)?.[1], batch: BATCH_SEGMENT.exec(s)?.[1] }));
    const isMetadataLine = line.trim() !== '' && parsed.every((p) => p.cask || p.batch);
    if (!isMetadataLine) {
      kept.push(line);
      continue;
    }
    for (const p of parsed) {
      if (p.cask) caskNumber = p.cask.trim();
      if (p.batch) batch = p.batch.trim();
    }
  }

  const text = kept.join('\n').trim();
  return { notes: text === '' ? null : text, cask_number: caskNumber, batch };
}

function rumKey(rum: V1Rum): string {
  return [
    normalize(rum.distillery ?? ''),
    normalize(rum.cuvee_name ?? ''),
    rum.vintage ?? '',
    rum.abv === null || rum.abv === '' ? '' : Number(rum.abv),
    rum.volume_ml ?? 700,
  ].join('|');
}

function inRange(value: number | null, min: number, max: number): boolean {
  return value !== null && Number.isInteger(value) && value >= min && value <= max;
}

function transformRum(rum: V1Rum): { row: RumRow; reviews: string[] } {
  const reviews: string[] = [];
  const required = (value: string | null, label: string) => {
    if (value?.trim()) return value.trim();
    reviews.push(`${label} manquant${label === 'Cuvée' || label === 'Distillerie' ? 'e' : ''} en v1`);
    return 'Inconnu';
  };

  const style = mapStyle(rum.style);
  if (style === undefined) reviews.push(`Style v1 inconnu : « ${rum.style} »`);
  const type = mapType(rum.type);
  if (type === undefined) reviews.push(`Type v1 inconnu : « ${rum.type} »`);

  const abvNumber = rum.abv === null || rum.abv === '' ? null : Number(rum.abv);
  const abvValid = abvNumber !== null && Number.isFinite(abvNumber) && abvNumber >= 0 && abvNumber <= 100;
  if (abvNumber !== null && !abvValid) reviews.push(`Degré v1 invalide : ${rum.abv}`);
  if (rum.vintage !== null && !inRange(rum.vintage, 1800, 2100)) reviews.push(`Millésime v1 invalide : ${rum.vintage}`);
  if (rum.age !== null && !inRange(rum.age, 0, 200)) reviews.push(`Âge v1 invalide : ${rum.age}`);
  if (rum.volume_ml !== null && !inRange(rum.volume_ml, 10, 10000)) reviews.push(`Volume v1 invalide : ${rum.volume_ml}`);

  return {
    row: {
      legacy_id: rum.id,
      distillery: required(rum.distillery, 'Distillerie'),
      cuvee_name: required(rum.cuvee_name, 'Cuvée'),
      country: required(rum.country, 'Pays'),
      region: rum.region?.trim() || null,
      brand: rum.brand?.trim() || null,
      style: style ?? null,
      type: type ?? null,
      vintage: inRange(rum.vintage, 1800, 2100) ? rum.vintage : null,
      age: inRange(rum.age, 0, 200) ? rum.age : null,
      abv: abvValid ? String(abvNumber) : null,
      volume_ml: inRange(rum.volume_ml, 10, 10000) ? rum.volume_ml! : 700,
      limited_edition: rum.limited_edition ?? false,
      limited_count: rum.limited_count && rum.limited_count > 0 ? rum.limited_count : null,
      thumbnail_url: rum.thumbnail_url || null,
    },
    reviews,
  };
}

function photoFileName(url: string): string {
  let last = '';
  try {
    last = new URL(url).pathname.split('/').pop() ?? '';
  } catch {
    last = url.split('/').pop() ?? '';
  }
  const safe = decodeURIComponent(last).replace(/[^A-Za-z0-9._-]/g, '_');
  return `legacy-${safe || 'photo.jpg'}`;
}

function item(
  entity: ReportItem['entity'],
  legacyId: string,
  reviews: string[],
): ReportItem {
  return reviews.length > 0
    ? { entity, legacy_id: legacyId, status: 'to_review', message: reviews.join(' ; ') }
    : { entity, legacy_id: legacyId, status: 'imported' };
}

export function transformSnapshot(snapshot: V1Snapshot): MigrationPlan {
  const report: ReportItem[] = [];

  const cellars: CellarRow[] = snapshot.cellars.map((cellar) => {
    report.push(item('cellar', cellar.id, []));
    return {
      legacy_id: cellar.id,
      name: cellar.name?.trim() || 'Cave sans nom',
      type: cellar.type === 'professional' ? 'professional' : 'personal',
      location: cellar.location?.trim() || null,
    };
  });
  const cellarIds = new Set(cellars.map((c) => c.legacy_id));

  // Rhums : on conserve la première occurrence de chaque référence identique.
  const rums: RumRow[] = [];
  const canonicalByKey = new Map<string, string>();
  const canonicalById = new Map<string, string>();
  for (const rum of snapshot.rums) {
    const key = rumKey(rum);
    const existing = canonicalByKey.get(key);
    if (existing) {
      canonicalById.set(rum.id, existing);
      report.push({ entity: 'rum', legacy_id: rum.id, status: 'skipped', message: `Doublon du rhum ${existing}` });
      continue;
    }
    canonicalByKey.set(key, rum.id);
    canonicalById.set(rum.id, rum.id);
    const { row, reviews } = transformRum(rum);
    rums.push(row);
    report.push(item('rum', rum.id, reviews));
  }

  const bottles: BottleRow[] = [];
  const purchases: PurchaseRow[] = [];
  const valuations: ValuationRow[] = [];
  const photos: PhotoRow[] = [];

  for (const bottle of snapshot.bottles) {
    const rumId = canonicalById.get(bottle.rum_id);
    if (!rumId) {
      report.push({ entity: 'bottle', legacy_id: bottle.id, status: 'skipped', message: `Rhum v1 introuvable (${bottle.rum_id})` });
      continue;
    }
    if (!cellarIds.has(bottle.cellar_id)) {
      report.push({ entity: 'bottle', legacy_id: bottle.id, status: 'skipped', message: `Cave v1 introuvable (${bottle.cellar_id})` });
      continue;
    }

    const reviews: string[] = [];
    const { status, review } = mapStatus(bottle.status);
    if (review) reviews.push(review);
    let quantity = bottle.quantity ?? 1;
    if (!inRange(quantity, 1, 1000)) {
      reviews.push(`Quantité v1 invalide : ${bottle.quantity}`);
      quantity = 1;
    }
    const parsed = parseNotes(bottle.notes);

    bottles.push({
      legacy_id: bottle.id,
      cellar_legacy_id: bottle.cellar_id,
      rum_legacy_id: rumId,
      status,
      quantity,
      cask_number: parsed.cask_number,
      batch: parsed.batch,
      location_text: bottle.location_text?.trim() || null,
      notes: parsed.notes,
    });
    report.push(item('bottle', bottle.id, reviews));

    const purchaseId = `purchase:${bottle.id}`;
    const unitPrice = toMoney(bottle.purchase_price);
    purchases.push({
      legacy_id: purchaseId,
      bottle_legacy_id: bottle.id,
      purchased_on: bottle.purchase_date ? bottle.purchase_date.slice(0, 10) : null,
      seller: bottle.purchase_place?.trim() || null,
      unit_price: unitPrice,
      currency: 'EUR',
    });
    report.push(
      item('purchase', purchaseId, unitPrice === '0.00' ? ['Prix d’achat à 0 € en v1 (cadeau ou prix inconnu ?)'] : []),
    );

    const currentValue = toMoney(bottle.current_value);
    if (currentValue !== null) {
      valuations.push({
        legacy_id: `current_value:${bottle.id}`,
        bottle_legacy_id: bottle.id,
        value: currentValue,
        kind: 'legacy',
        source: 'Cavarum v1 (valeur actuelle)',
        valued_at: snapshot.extracted_at,
      });
    }

    if (bottle.photo_url) {
      const photoId = `photo:${bottle.id}`;
      photos.push({
        legacy_id: photoId,
        bottle_legacy_id: bottle.id,
        source_url: bottle.photo_url,
        relative_path: `${bottle.id}/${photoFileName(bottle.photo_url)}`,
      });
      report.push(item('photo', photoId, []));
    }
  }

  const bottleIds = new Set(bottles.map((b) => b.legacy_id));
  snapshot.valuations.forEach((valuation, index) => {
    const legacyId = `valuation:${valuation.id ?? `${valuation.bottle_id}#${index}`}`;
    const value = toMoney(valuation.estimated_value);
    if (!bottleIds.has(valuation.bottle_id) || value === null) {
      report.push({
        entity: 'valuation',
        legacy_id: legacyId,
        status: 'skipped',
        message: value === null ? 'Valeur v1 invalide' : `Bouteille v1 non reprise (${valuation.bottle_id})`,
      });
      return;
    }
    valuations.push({
      legacy_id: legacyId,
      bottle_legacy_id: valuation.bottle_id,
      value,
      kind: 'manual',
      source: 'Cavarum v1 (historique)',
      valued_at: valuation.created_at ?? snapshot.extracted_at,
    });
  });

  return { cellars, rums, bottles, purchases, valuations, photos, report };
}
