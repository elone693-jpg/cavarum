import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db';

let db: TestDb;
let alice: string;
let bob: string;
let rum: string;

const count = async (table: string, userId: string) =>
  Number(
    (await db.asAdmin<{ n: string }>(`select count(*)::text as n from public.${table} where user_id = $1`, [userId]))[0]!.n,
  );

beforeAll(async () => {
  db = await createTestDb();
  alice = await db.createUser('alice@example.com');
  bob = await db.createUser('bob@example.com');
  [{ id: rum }] = (await db.asUser<{ id: string }>(
    alice,
    `insert into public.rums (distillery, cuvee_name, country, created_by) values ('Saint James','Fleur de canne','Martinique',$1) returning id`,
    [alice],
  )) as [{ id: string }];
  for (const user of [alice, bob]) {
    const [cellar] = await db.asAdmin<{ id: string }>(`insert into public.cellars (user_id, name) values ($1,'Cave') returning id`, [user]);
    const [bottle] = await db.asAdmin<{ id: string }>(
      `insert into public.bottles (user_id, cellar_id, rum_id) values ($1,$2,$3) returning id`,
      [user, cellar!.id, rum],
    );
    await db.asAdmin(`insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,10)`, [user, bottle!.id]);
    await db.asAdmin(`insert into public.valuations_history (user_id, bottle_id, value, kind) values ($1,$2,12,'manual')`, [user, bottle!.id]);
  }
});

describe('suppression de compte (droit à l’effacement)', () => {
  it('un visiteur anonyme ne peut pas appeler la suppression', async () => {
    await expect(db.asAnon(`select public.delete_my_account()`)).rejects.toThrow();
  });

  it('supprime le compte et toutes les données de l’utilisateur, et seulement les siennes', async () => {
    await db.asUser(alice, `select public.delete_my_account()`);

    expect(await db.asAdmin(`select id from auth.users where id = $1`, [alice])).toHaveLength(0);
    expect(await db.asAdmin(`select id from public.profiles where id = $1`, [alice])).toHaveLength(0);
    for (const table of ['cellars', 'bottles', 'purchases', 'valuations_history']) {
      expect(await count(table, alice)).toBe(0);
      expect(await count(table, bob)).toBe(1);
    }
  });

  it('conserve le rhum dans le catalogue partagé sans garder l’auteur', async () => {
    const [row] = await db.asAdmin<{ created_by: string | null }>(`select created_by from public.rums where id = $1`, [rum]);
    expect(row!.created_by).toBeNull();
  });
});
