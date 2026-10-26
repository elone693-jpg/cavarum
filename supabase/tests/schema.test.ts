import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db';

let db: TestDb;
let alice: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await db.createUser('alice@example.com');
});

async function insertRum(overrides: Record<string, unknown> = {}) {
  const fields = { distillery: 'Neisson', cuvee_name: 'Réserve Spéciale', country: 'Martinique', ...overrides };
  const keys = Object.keys(fields);
  const rows = await db.asAdmin<{ id: string }>(
    `insert into public.rums (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning id`,
    Object.values(fields),
  );
  return rows[0]!.id;
}

async function insertCellar(userId: string) {
  const rows = await db.asAdmin<{ id: string }>(
    `insert into public.cellars (user_id, name) values ($1, 'Cave principale') returning id`,
    [userId],
  );
  return rows[0]!.id;
}

describe('profil créé à l’inscription', () => {
  it('crée automatiquement un profil avec le nom et l’email', async () => {
    const rows = await db.asAdmin<{ email: string; name: string }>(
      `select email, name from public.profiles where id = $1`,
      [alice],
    );
    expect(rows).toEqual([{ email: 'alice@example.com', name: 'Test' }]);
  });
});

describe('contraintes du catalogue', () => {
  it('refuse un degré hors de 0–100', async () => {
    await expect(insertRum({ abv: 120 })).rejects.toThrow();
  });

  it('refuse un millésime hors de 1800–2100', async () => {
    await expect(insertRum({ vintage: 1700 })).rejects.toThrow();
  });

  it('applique 700 ml par défaut', async () => {
    const id = await insertRum();
    const rows = await db.asAdmin<{ volume_ml: number }>(`select volume_ml from public.rums where id = $1`, [id]);
    expect(rows[0]!.volume_ml).toBe(700);
  });

  it('accepte les styles et types attendus', async () => {
    await expect(insertRum({ style: 'agricole', type: 'single_cask' })).resolves.toBeTruthy();
    await expect(insertRum({ style: 'Agricole' })).rejects.toThrow();
  });
});

describe('contraintes des bouteilles et achats', () => {
  it('refuse une quantité inférieure à 1', async () => {
    const cellar = await insertCellar(alice);
    const rum = await insertRum();
    await expect(
      db.asAdmin(`insert into public.bottles (user_id, cellar_id, rum_id, quantity) values ($1,$2,$3,0)`, [alice, cellar, rum]),
    ).rejects.toThrow();
  });

  it('statut « en cave » par défaut', async () => {
    const cellar = await insertCellar(alice);
    const rum = await insertRum();
    const rows = await db.asAdmin<{ status: string }>(
      `insert into public.bottles (user_id, cellar_id, rum_id) values ($1,$2,$3) returning status`,
      [alice, cellar, rum],
    );
    expect(rows[0]!.status).toBe('in_cellar');
  });

  it('stocke les montants au centime exact et refuse les montants négatifs', async () => {
    const cellar = await insertCellar(alice);
    const rum = await insertRum();
    const [bottle] = await db.asAdmin<{ id: string }>(
      `insert into public.bottles (user_id, cellar_id, rum_id) values ($1,$2,$3) returning id`,
      [alice, cellar, rum],
    );
    const rows = await db.asAdmin<{ unit_price: string }>(
      `insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,'123.455') returning unit_price::text`,
      [alice, bottle!.id],
    );
    expect(rows[0]!.unit_price).toBe('123.46');
    await expect(
      db.asAdmin(`insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,-1)`, [alice, bottle!.id]),
    ).rejects.toThrow();
  });

  it('rend legacy_id unique pour garantir une migration rejouable', async () => {
    await db.asAdmin(`insert into public.cellars (user_id, name, legacy_id) values ($1,'A','v1-cellar-1')`, [alice]);
    await expect(
      db.asAdmin(`insert into public.cellars (user_id, name, legacy_id) values ($1,'B','v1-cellar-1')`, [alice]),
    ).rejects.toThrow();
  });
});
