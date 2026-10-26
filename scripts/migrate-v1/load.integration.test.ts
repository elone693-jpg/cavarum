import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../supabase/tests/helpers/db';
import { loadPlan, type V2Writer } from './load';
import { transformSnapshot } from './transform';
import type { ReportItem, V1Snapshot } from './types';

/** Écrit dans le vrai schéma v2 (PGlite) en tant qu'utilisateur authentifié : RLS et contraintes appliquées. */
class PgliteWriter implements V2Writer {
  constructor(
    private db: TestDb,
    public userId: string,
  ) {}

  async upsert(table: string, rows: Record<string, unknown>[], options: { ignoreDuplicates?: boolean } = {}) {
    if (rows.length === 0) return [];
    for (const row of rows) {
      const columns = Object.keys(row);
      const conflict = options.ignoreDuplicates
        ? 'do nothing'
        : `do update set ${columns.filter((c) => c !== 'legacy_id').map((c) => `${c} = excluded.${c}`).join(', ')}`;
      await this.db.asUser(
        this.userId,
        `insert into public.${table} (${columns.join(', ')}) values (${columns.map((_, i) => `$${i + 1}`).join(', ')})
         on conflict (legacy_id) ${conflict}`,
        Object.values(row),
      );
    }
    return this.db.asUser<{ id: string; legacy_id: string }>(
      this.userId,
      `select id, legacy_id from public.${table} where legacy_id = any($1)`,
      [rows.map((r) => r.legacy_id)],
    );
  }

  async copyPhoto(_sourceUrl: string, destinationPath: string) {
    await this.db.asUser(
      this.userId,
      `insert into storage.objects (bucket_id, name) values ('bottle-photos', $1)
       on conflict do nothing`,
      [destinationPath],
    );
  }

  async startRun() {
    const [run] = await this.db.asUser<{ id: string }>(
      this.userId,
      `insert into public.migration_runs (user_id) values ($1) returning id`,
      [this.userId],
    );
    return run!.id;
  }

  async recordItems(runId: string, items: ReportItem[]) {
    for (const i of items) {
      await this.db.asUser(
        this.userId,
        `insert into public.migration_items (run_id, user_id, entity, legacy_id, status, message) values ($1,$2,$3,$4,$5,$6)`,
        [runId, this.userId, i.entity, i.legacy_id, i.status, i.message ?? null],
      );
    }
  }

  async finishRun(runId: string, summary: unknown) {
    await this.db.asUser(this.userId, `update public.migration_runs set finished_at = now(), summary = $2 where id = $1`, [
      runId,
      JSON.stringify(summary),
    ]);
  }
}

const snapshot: V1Snapshot = {
  extracted_at: '2026-10-26T12:00:00Z',
  cellars: [
    { id: 'c-1', user_id: 'u-1', name: 'Cave principale', type: 'personal', location: 'Sous-sol', created_at: null },
    { id: 'c-2', user_id: 'u-1', name: 'Cave Paris', type: 'professional', location: null, created_at: null },
  ],
  rums: [
    {
      id: 'rum-1', distillery: 'Neisson', cuvee_name: 'Réserve Spéciale', country: 'Martinique', region: 'Le Carbet',
      brand: null, style: 'Agricole', type: 'Standard', vintage: null, age: null, abv: 42, volume_ml: 700,
      limited_edition: false, limited_count: null, thumbnail_url: null,
    },
    {
      id: 'rum-2', distillery: 'Hampden', cuvee_name: 'LROK', country: 'Jamaïque', region: null, brand: 'Velier',
      style: 'Melasse', type: 'Single cask', vintage: 2010, age: 12, abv: '59.8', volume_ml: 700,
      limited_edition: true, limited_count: 300, thumbnail_url: null,
    },
  ],
  bottles: [
    {
      id: 'b-1', user_id: 'u-1', cellar_id: 'c-1', rum_id: 'rum-1', quantity: 2, purchase_date: '2024-05-01',
      purchase_price: 89.9, current_value: 120, purchase_place: 'Excellence Rhum', location_text: 'Étagère A',
      notes: 'Top\n\nFût n°7 | Batch: B2', status: 'sealed', photo_url: 'https://v1/a.jpg', created_at: null,
    },
    {
      id: 'b-2', user_id: 'u-1', cellar_id: 'c-2', rum_id: 'rum-2', quantity: 1, purchase_date: '2023-01-10',
      purchase_price: 0, current_value: 450.5, purchase_place: null, location_text: null, notes: null,
      status: 'finished', photo_url: null, created_at: null,
    },
  ],
  valuations: [{ id: 'v-1', bottle_id: 'b-1', estimated_value: 110, created_at: '2025-06-01T00:00:00Z' }],
  unreadable_tables: [],
};

let db: TestDb;
let user: string;
let other: string;

beforeAll(async () => {
  db = await createTestDb();
  user = await db.createUser('collectionneur@example.com');
  other = await db.createUser('autre@example.com');
});

describe('migration v1 → v2 sur le vrai schéma', () => {
  it('importe tout, puis une relance ne crée aucun doublon', async () => {
    const plan = transformSnapshot(snapshot);
    const writer = new PgliteWriter(db, user);
    const first = await loadPlan(plan, writer);
    const second = await loadPlan(plan, writer);

    expect(first.counts).toEqual({ cellars: 2, rums: 2, bottles: 2, bottle_units: 3, purchases: 2, valuations: 3, photos: 1 });
    expect(second.counts).toEqual(first.counts);

    const count = async (table: string) =>
      Number((await db.asAdmin<{ n: string }>(`select count(*)::text as n from public.${table}`))[0]!.n);
    expect(await count('cellars')).toBe(2);
    expect(await count('rums')).toBe(2);
    expect(await count('bottles')).toBe(2);
    expect(await count('purchases')).toBe(2);
    expect(await count('valuations_history')).toBe(3);
    expect(await count('bottle_photos')).toBe(1);
    expect(await count('migration_runs')).toBe(2);
  });

  it('conserve les données métier exactes', async () => {
    const [bottle] = await db.asUser<Record<string, unknown>>(
      user,
      `select b.status, b.quantity, b.cask_number, b.batch, b.notes, b.location_text, c.name as cellar, r.style, r.type, r.abv::text
         from public.bottles b join public.cellars c on c.id = b.cellar_id join public.rums r on r.id = b.rum_id
        where b.legacy_id = 'b-1'`,
    );
    expect(bottle).toEqual({
      status: 'in_cellar', quantity: 2, cask_number: '7', batch: 'B2', notes: 'Top', location_text: 'Étagère A',
      cellar: 'Cave principale', style: 'agricole', type: 'standard', abv: '42.0',
    });

    const [purchase] = await db.asUser<Record<string, unknown>>(
      user,
      `select unit_price::text, seller, purchased_on::text from public.purchases where legacy_id = 'purchase:b-1'`,
    );
    expect(purchase).toEqual({ unit_price: '89.90', seller: 'Excellence Rhum', purchased_on: '2024-05-01' });

    const [status] = await db.asUser<{ status: string }>(user, `select status from public.bottles where legacy_id = 'b-2'`);
    expect(status!.status).toBe('empty');
  });

  it('les données migrées restent invisibles pour un autre utilisateur', async () => {
    expect(await db.asUser(other, `select * from public.bottles`)).toHaveLength(0);
    expect(await db.asUser(other, `select * from public.purchases`)).toHaveLength(0);
  });

  it('enregistre le rapport, y compris les éléments à vérifier', async () => {
    const items = await db.asUser<{ status: string; legacy_id: string }>(
      user,
      `select status, legacy_id from public.migration_items where status = 'to_review'`,
    );
    expect(items.map((i) => i.legacy_id)).toContain('purchase:b-2');
  });
});
