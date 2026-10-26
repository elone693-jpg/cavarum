import { describe, expect, it } from 'vitest';
import { loadPlan, type V2Writer } from './load';
import { transformSnapshot } from './transform';
import type { V1Snapshot } from './types';

type Row = Record<string, unknown> & { id: string; legacy_id: string };

/** Base v2 en mémoire : upsert sur legacy_id, comme la contrainte unique réelle. */
class FakeWriter implements V2Writer {
  userId = 'user-v2';
  tables = new Map<string, Map<string, Row>>();
  copied: string[] = [];
  failingPhotos = new Set<string>();
  runs: { id: string; summary?: unknown; items: unknown[] }[] = [];
  private seq = 0;

  async upsert(table: string, rows: Record<string, unknown>[], options: { ignoreDuplicates?: boolean } = {}) {
    const store = this.tables.get(table) ?? new Map<string, Row>();
    this.tables.set(table, store);
    for (const row of rows) {
      const legacyId = row.legacy_id as string;
      const existing = store.get(legacyId);
      if (existing && options.ignoreDuplicates) continue;
      store.set(legacyId, { ...existing, ...row, id: existing?.id ?? `${table}-${++this.seq}`, legacy_id: legacyId });
    }
    return rows.map((r) => {
      const stored = store.get(r.legacy_id as string)!;
      return { id: stored.id, legacy_id: stored.legacy_id };
    });
  }

  async copyPhoto(sourceUrl: string, destinationPath: string) {
    if (this.failingPhotos.has(sourceUrl)) throw new Error('HTTP 404');
    this.copied.push(destinationPath);
  }

  async startRun() {
    const id = `run-${this.runs.length + 1}`;
    this.runs.push({ id, items: [] });
    return id;
  }

  async recordItems(runId: string, items: unknown[]) {
    this.runs.find((r) => r.id === runId)!.items.push(...items);
  }

  async finishRun(runId: string, summary: unknown) {
    this.runs.find((r) => r.id === runId)!.summary = summary;
  }

  rows(table: string) {
    return [...(this.tables.get(table)?.values() ?? [])];
  }
}

const snapshot: V1Snapshot = {
  extracted_at: '2026-10-26T12:00:00Z',
  cellars: [{ id: 'c-1', user_id: 'u-1', name: 'Cave', type: 'personal', location: null, created_at: null }],
  rums: [
    {
      id: 'rum-1', distillery: 'Neisson', cuvee_name: 'RS', country: 'Martinique', region: null, brand: null,
      style: 'Agricole', type: null, vintage: null, age: null, abv: 42, volume_ml: 700, limited_edition: false,
      limited_count: null, thumbnail_url: null,
    },
  ],
  bottles: [
    {
      id: 'b-1', user_id: 'u-1', cellar_id: 'c-1', rum_id: 'rum-1', quantity: 2, purchase_date: '2024-01-01',
      purchase_price: 50, current_value: 70, purchase_place: null, location_text: null, notes: null,
      status: 'sealed', photo_url: 'https://v1/photo-1.jpg', created_at: null,
    },
    {
      id: 'b-2', user_id: 'u-1', cellar_id: 'c-1', rum_id: 'rum-1', quantity: 1, purchase_date: null,
      purchase_price: 60, current_value: null, purchase_place: null, location_text: null, notes: null,
      status: 'open', photo_url: 'https://v1/photo-2.jpg', created_at: null,
    },
  ],
  valuations: [],
  unreadable_tables: [],
};

describe('loadPlan', () => {
  it('résout les références v1 vers les identifiants v2', async () => {
    const writer = new FakeWriter();
    await loadPlan(transformSnapshot(snapshot), writer);

    const cellar = writer.rows('cellars')[0]!;
    const rum = writer.rows('rums')[0]!;
    const bottles = writer.rows('bottles');
    expect(bottles).toHaveLength(2);
    for (const b of bottles) {
      expect(b).toMatchObject({ cellar_id: cellar.id, rum_id: rum.id, user_id: 'user-v2' });
    }
    const purchase = writer.rows('purchases').find((p) => p.legacy_id === 'purchase:b-1')!;
    expect(purchase).toMatchObject({ bottle_id: bottles.find((b) => b.legacy_id === 'b-1')!.id, unit_price: '50.00' });
  });

  it('trace l’auteur des rhums et n’écrase jamais un rhum existant du catalogue', async () => {
    const writer = new FakeWriter();
    await writer.upsert('rums', [{ legacy_id: 'rum-1', cuvee_name: 'Déjà là' }]);
    await loadPlan(transformSnapshot(snapshot), writer);
    expect(writer.rows('rums')).toHaveLength(1);
    expect(writer.rows('rums')[0]).toMatchObject({ cuvee_name: 'Déjà là' });
  });

  it('pose created_by sur un rhum nouvellement créé', async () => {
    const writer = new FakeWriter();
    await loadPlan(transformSnapshot(snapshot), writer);
    expect(writer.rows('rums')[0]).toMatchObject({ created_by: 'user-v2' });
  });

  it('est rejouable sans créer de doublons', async () => {
    const writer = new FakeWriter();
    const plan = transformSnapshot(snapshot);
    await loadPlan(plan, writer);
    await loadPlan(plan, writer);
    expect(writer.rows('cellars')).toHaveLength(1);
    expect(writer.rows('bottles')).toHaveLength(2);
    expect(writer.rows('purchases')).toHaveLength(2);
    expect(writer.rows('valuations_history')).toHaveLength(1);
    expect(writer.rows('bottle_photos')).toHaveLength(2);
  });

  it('copie les photos dans le dossier de l’utilisateur v2', async () => {
    const writer = new FakeWriter();
    await loadPlan(transformSnapshot(snapshot), writer);
    expect(writer.copied).toEqual(['user-v2/b-1/legacy-photo-1.jpg', 'user-v2/b-2/legacy-photo-2.jpg']);
    expect(writer.rows('bottle_photos').map((p) => p.storage_path)).toEqual([
      'user-v2/b-1/legacy-photo-1.jpg',
      'user-v2/b-2/legacy-photo-2.jpg',
    ]);
  });

  it('continue si une photo est inaccessible et la signale dans le rapport', async () => {
    const writer = new FakeWriter();
    writer.failingPhotos.add('https://v1/photo-1.jpg');
    const result = await loadPlan(transformSnapshot(snapshot), writer);
    expect(writer.rows('bottle_photos')).toHaveLength(1);
    expect(result.report).toContainEqual({
      entity: 'photo',
      legacy_id: 'photo:b-1',
      status: 'skipped',
      message: 'Photo v1 inaccessible : HTTP 404',
    });
    expect(result.report.filter((r) => r.legacy_id === 'photo:b-1')).toHaveLength(1);
  });

  it('enregistre le rapport et les totaux dans migration_runs', async () => {
    const writer = new FakeWriter();
    const result = await loadPlan(transformSnapshot(snapshot), writer);
    expect(writer.runs).toHaveLength(1);
    expect(writer.runs[0]!.items).toHaveLength(result.report.length);
    expect(result.counts).toEqual({ cellars: 1, rums: 1, bottles: 2, bottle_units: 3, purchases: 2, valuations: 1, photos: 2 });
    expect(writer.runs[0]!.summary).toEqual(result.counts);
  });
});
