import { describe, expect, it } from 'vitest';
import { mapStatus, mapStyle, mapType, parseNotes, toMoney, transformSnapshot } from './transform';
import type { V1Bottle, V1Rum, V1Snapshot } from './types';

describe('toMoney', () => {
  it('formate au centime', () => {
    expect(toMoney(89.9)).toBe('89.90');
    expect(toMoney('120')).toBe('120.00');
    expect(toMoney(0)).toBe('0.00');
  });

  it('arrondit au demi-centime supérieur sans erreur de virgule flottante', () => {
    expect(toMoney(1.005)).toBe('1.01');
    expect(toMoney('123.455')).toBe('123.46');
    expect(toMoney(2.675)).toBe('2.68');
  });

  it('retourne null pour une valeur absente ou invalide', () => {
    expect(toMoney(null)).toBeNull();
    expect(toMoney('')).toBeNull();
    expect(toMoney('abc')).toBeNull();
    expect(toMoney(-5)).toBeNull();
  });
});

describe('mapStatus', () => {
  it('convertit les statuts v1', () => {
    expect(mapStatus('sealed')).toEqual({ status: 'in_cellar' });
    expect(mapStatus('open')).toEqual({ status: 'open' });
    expect(mapStatus('finished')).toEqual({ status: 'empty' });
    expect(mapStatus('sold')).toEqual({ status: 'sold' });
  });

  it('signale un statut inconnu et le range en cave', () => {
    expect(mapStatus('bizarre')).toEqual({ status: 'in_cellar', review: 'Statut v1 inconnu : « bizarre »' });
    expect(mapStatus(null)).toEqual({ status: 'in_cellar' });
  });
});

describe('mapStyle / mapType', () => {
  it('convertit les libellés v1, accents compris', () => {
    expect(mapStyle('Agricole')).toBe('agricole');
    expect(mapStyle('Mélasse')).toBe('melasse');
    expect(mapStyle('Melasse')).toBe('melasse');
    expect(mapStyle('Pure Cane')).toBe('pure_cane');
    expect(mapType('Brut de fût')).toBe('brut_de_fut');
    expect(mapType('Single cask')).toBe('single_cask');
    expect(mapType('Cask strength')).toBe('cask_strength');
  });

  it('retourne undefined pour une valeur inconnue et null pour une valeur vide', () => {
    expect(mapStyle('Rhum arrangé')).toBeUndefined();
    expect(mapType(null)).toBeNull();
    expect(mapStyle('')).toBeNull();
  });
});

describe('parseNotes', () => {
  it('laisse des notes vides à null', () => {
    expect(parseNotes(null)).toEqual({ notes: null, cask_number: null, batch: null });
    expect(parseNotes('   ')).toEqual({ notes: null, cask_number: null, batch: null });
  });

  it('conserve des notes sans fût ni batch', () => {
    expect(parseNotes('Cadeau de Paul')).toEqual({ notes: 'Cadeau de Paul', cask_number: null, batch: null });
  });

  it('extrait le fût et le batch ajoutés par l’IA v1 après les notes', () => {
    expect(parseNotes('Superbe nez\n\nFût n°123 | Batch: B-7')).toEqual({
      notes: 'Superbe nez',
      cask_number: '123',
      batch: 'B-7',
    });
  });

  it('extrait le fût seul quand il n’y a pas d’autres notes', () => {
    expect(parseNotes('Fût n°42')).toEqual({ notes: null, cask_number: '42', batch: null });
  });

  it('extrait le batch seul', () => {
    expect(parseNotes('Batch: 3')).toEqual({ notes: null, cask_number: null, batch: '3' });
  });

  it('ne touche pas une ligne qui mentionne un fût au milieu d’une phrase', () => {
    const text = 'Le Fût n°12 était le meilleur | à revoir';
    expect(parseNotes(text)).toEqual({ notes: text, cask_number: null, batch: null });
  });
});

const rum = (over: Partial<V1Rum> = {}): V1Rum => ({
  id: 'rum-1',
  distillery: 'Neisson',
  cuvee_name: 'Réserve Spéciale',
  country: 'Martinique',
  region: 'Le Carbet',
  brand: null,
  style: 'Agricole',
  type: 'Standard',
  vintage: null,
  age: null,
  abv: 42,
  volume_ml: 700,
  limited_edition: false,
  limited_count: null,
  thumbnail_url: null,
  ...over,
});

const bottle = (over: Partial<V1Bottle> = {}): V1Bottle => ({
  id: 'b-1',
  user_id: 'u-1',
  cellar_id: 'c-1',
  rum_id: 'rum-1',
  quantity: 2,
  purchase_date: '2024-05-01',
  purchase_price: 89.9,
  current_value: 120,
  purchase_place: 'Excellence Rhum',
  location_text: 'Étagère A',
  notes: 'Top\n\nFût n°7',
  status: 'sealed',
  photo_url: 'https://xyz.supabase.co/storage/v1/object/public/bottle-photos/u-1/1700000000.jpg',
  created_at: '2024-05-02T10:00:00Z',
  ...over,
});

const snapshot = (over: Partial<V1Snapshot> = {}): V1Snapshot => ({
  extracted_at: '2026-10-26T12:00:00Z',
  cellars: [{ id: 'c-1', user_id: 'u-1', name: 'Cave principale', type: 'personal', location: 'Sous-sol', created_at: null }],
  rums: [rum()],
  bottles: [bottle()],
  valuations: [],
  unreadable_tables: [],
  ...over,
});

describe('transformSnapshot', () => {
  it('reprend une cave', () => {
    const plan = transformSnapshot(snapshot());
    expect(plan.cellars).toEqual([{ legacy_id: 'c-1', name: 'Cave principale', type: 'personal', location: 'Sous-sol' }]);
  });

  it('reprend une bouteille avec son statut, son fût et ses notes nettoyées', () => {
    const plan = transformSnapshot(snapshot());
    expect(plan.bottles).toEqual([
      {
        legacy_id: 'b-1',
        cellar_legacy_id: 'c-1',
        rum_legacy_id: 'rum-1',
        status: 'in_cellar',
        quantity: 2,
        cask_number: '7',
        batch: null,
        location_text: 'Étagère A',
        notes: 'Top',
      },
    ]);
  });

  it('sort l’achat de la bouteille', () => {
    const plan = transformSnapshot(snapshot());
    expect(plan.purchases).toEqual([
      {
        legacy_id: 'purchase:b-1',
        bottle_legacy_id: 'b-1',
        purchased_on: '2024-05-01',
        seller: 'Excellence Rhum',
        unit_price: '89.90',
        currency: 'EUR',
      },
    ]);
  });

  it('signale un prix d’achat à 0 comme à vérifier', () => {
    const plan = transformSnapshot(snapshot({ bottles: [bottle({ purchase_price: 0 })] }));
    expect(plan.purchases[0]!.unit_price).toBe('0.00');
    expect(plan.report).toContainEqual({
      entity: 'purchase',
      legacy_id: 'purchase:b-1',
      status: 'to_review',
      message: 'Prix d’achat à 0 € en v1 (cadeau ou prix inconnu ?)',
    });
  });

  it('transforme la valeur actuelle v1 en estimation « legacy » datée de l’extraction', () => {
    const plan = transformSnapshot(snapshot());
    expect(plan.valuations).toContainEqual({
      legacy_id: 'current_value:b-1',
      bottle_legacy_id: 'b-1',
      value: '120.00',
      kind: 'legacy',
      source: 'Cavarum v1 (valeur actuelle)',
      valued_at: '2026-10-26T12:00:00Z',
    });
  });

  it('reprend l’historique des estimations v1 comme estimations manuelles', () => {
    const plan = transformSnapshot(
      snapshot({ valuations: [{ id: 'v-9', bottle_id: 'b-1', estimated_value: 110, created_at: '2025-01-01T00:00:00Z' }] }),
    );
    expect(plan.valuations).toContainEqual({
      legacy_id: 'valuation:v-9',
      bottle_legacy_id: 'b-1',
      value: '110.00',
      kind: 'manual',
      source: 'Cavarum v1 (historique)',
      valued_at: '2025-01-01T00:00:00Z',
    });
  });

  it('prépare la copie de la photo dans le dossier de la bouteille', () => {
    const plan = transformSnapshot(snapshot());
    expect(plan.photos).toEqual([
      {
        legacy_id: 'photo:b-1',
        bottle_legacy_id: 'b-1',
        source_url: 'https://xyz.supabase.co/storage/v1/object/public/bottle-photos/u-1/1700000000.jpg',
        relative_path: 'b-1/legacy-1700000000.jpg',
      },
    ]);
  });

  it('dédoublonne les rhums identiques et rattache les bouteilles au rhum conservé', () => {
    const plan = transformSnapshot(
      snapshot({
        rums: [rum(), rum({ id: 'rum-2', distillery: ' neisson ', cuvee_name: 'RÉSERVE SPÉCIALE' })],
        bottles: [bottle(), bottle({ id: 'b-2', rum_id: 'rum-2', photo_url: null })],
      }),
    );
    expect(plan.rums.map((r) => r.legacy_id)).toEqual(['rum-1']);
    expect(plan.bottles.map((b) => b.rum_legacy_id)).toEqual(['rum-1', 'rum-1']);
    expect(plan.report).toContainEqual({
      entity: 'rum',
      legacy_id: 'rum-2',
      status: 'skipped',
      message: 'Doublon du rhum rum-1',
    });
  });

  it('ne fusionne pas deux millésimes différents', () => {
    const plan = transformSnapshot(snapshot({ rums: [rum({ vintage: 2010 }), rum({ id: 'rum-2', vintage: 2012 })] }));
    expect(plan.rums).toHaveLength(2);
  });

  it('convertit style et type, et signale une valeur inconnue', () => {
    const plan = transformSnapshot(snapshot({ rums: [rum({ style: 'Rhum arrangé' })] }));
    expect(plan.rums[0]!.style).toBeNull();
    expect(plan.rums[0]!.type).toBe('standard');
    expect(plan.report).toContainEqual({
      entity: 'rum',
      legacy_id: 'rum-1',
      status: 'to_review',
      message: 'Style v1 inconnu : « Rhum arrangé »',
    });
  });

  it('signale une bouteille dont le rhum ou la cave est introuvable', () => {
    const plan = transformSnapshot(snapshot({ bottles: [bottle({ rum_id: 'absent' })] }));
    expect(plan.bottles).toHaveLength(0);
    expect(plan.report).toContainEqual({
      entity: 'bottle',
      legacy_id: 'b-1',
      status: 'skipped',
      message: 'Rhum v1 introuvable (absent)',
    });
  });

  it('complète les champs obligatoires manquants d’un rhum et le signale', () => {
    const plan = transformSnapshot(snapshot({ rums: [rum({ country: null })] }));
    expect(plan.rums[0]!.country).toBe('Inconnu');
    expect(plan.report).toContainEqual({
      entity: 'rum',
      legacy_id: 'rum-1',
      status: 'to_review',
      message: 'Pays manquant en v1',
    });
  });

  it('marque chaque élément repris comme importé dans le rapport', () => {
    const plan = transformSnapshot(snapshot());
    const imported = plan.report.filter((r) => r.status === 'imported').map((r) => `${r.entity}:${r.legacy_id}`);
    expect(imported).toEqual(
      expect.arrayContaining(['cellar:c-1', 'rum:rum-1', 'bottle:b-1', 'purchase:purchase:b-1', 'photo:photo:b-1']),
    );
  });
});
