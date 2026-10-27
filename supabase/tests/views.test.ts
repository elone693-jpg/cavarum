import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db';

let db: TestDb;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await db.createUser('alice@example.com');
  bob = await db.createUser('bob@example.com');
  const [rum] = await db.asAdmin<{ id: string }>(
    `insert into public.rums (distillery, cuvee_name, country) values ('Bielle','2008','Marie-Galante') returning id`,
  );
  const [cellar] = await db.asAdmin<{ id: string }>(
    `insert into public.cellars (user_id, name, location) values ($1,'Cave principale','Sous-sol') returning id`,
    [alice],
  );
  await db.asAdmin(`insert into public.cellars (user_id, name) values ($1,'Cave vide')`, [alice]);

  const bottle = async (quantity: number, price: string | null, status = 'in_cellar') => {
    const [b] = await db.asAdmin<{ id: string }>(
      `insert into public.bottles (user_id, cellar_id, rum_id, quantity, status) values ($1,$2,$3,$4,$5) returning id`,
      [alice, cellar!.id, rum!.id, quantity, status],
    );
    if (price !== null) {
      await db.asAdmin(`insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,$3)`, [alice, b!.id, price]);
    }
  };
  await bottle(2, '0.10');
  await bottle(1, '0.20');
  await bottle(3, null);
  await bottle(1, '50.00', 'sold');
});

describe('vue cellar_summaries', () => {
  it('calcule unités et coût d’achat exacts au centime, hors bouteilles sorties de la cave', async () => {
    const rows = await db.asUser<Record<string, unknown>>(
      alice,
      `select name, location, bottle_units, purchase_total::text from public.cellar_summaries order by name`,
    );
    expect(rows).toEqual([
      { name: 'Cave principale', location: 'Sous-sol', bottle_units: 6, purchase_total: '0.40' },
      { name: 'Cave vide', location: null, bottle_units: 0, purchase_total: '0.00' },
    ]);
  });

  it('respecte le cloisonnement entre utilisateurs', async () => {
    expect(await db.asUser(bob, `select * from public.cellar_summaries`)).toHaveLength(0);
  });
});

describe('vue collection_summary', () => {
  it('totalise caves, bouteilles possédées et coût d’achat de l’utilisateur', async () => {
    const rows = await db.asUser<Record<string, unknown>>(
      alice,
      `select cellar_count, bottle_units, purchase_total::text from public.collection_summary`,
    );
    expect(rows).toEqual([{ cellar_count: 2, bottle_units: 6, purchase_total: '0.40' }]);
  });

  it('renvoie des zéros pour un utilisateur sans cave', async () => {
    const rows = await db.asUser<Record<string, unknown>>(
      bob,
      `select cellar_count, bottle_units, purchase_total::text from public.collection_summary`,
    );
    expect(rows).toEqual([{ cellar_count: 0, bottle_units: 0, purchase_total: '0.00' }]);
  });
});
