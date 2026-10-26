import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db';

let db: TestDb;
let alice: string;
let bob: string;
let admin: string;
let aliceCellar: string;
let aliceBottle: string;
let rum: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await db.createUser('alice@example.com');
  bob = await db.createUser('bob@example.com');
  admin = await db.createUser('admin@example.com');
  await db.asAdmin(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [admin]);

  [{ id: rum }] = (await db.asAdmin<{ id: string }>(
    `insert into public.rums (distillery, cuvee_name, country) values ('Hampden','LROK 2010','Jamaïque') returning id`,
  )) as [{ id: string }];
  [{ id: aliceCellar }] = (await db.asAdmin<{ id: string }>(
    `insert into public.cellars (user_id, name) values ($1, 'Cave d’Alice') returning id`,
    [alice],
  )) as [{ id: string }];
  [{ id: aliceBottle }] = (await db.asAdmin<{ id: string }>(
    `insert into public.bottles (user_id, cellar_id, rum_id) values ($1,$2,$3) returning id`,
    [alice, aliceCellar, rum],
  )) as [{ id: string }];
  await db.asAdmin(`insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,89.90)`, [alice, aliceBottle]);
  await db.asAdmin(
    `insert into public.valuations_history (user_id, bottle_id, value, kind) values ($1,$2,120,'manual')`,
    [alice, aliceBottle],
  );
  await db.asAdmin(
    `insert into public.ai_usage (user_id, function_name, model, input_tokens, output_tokens, status) values ($1,'ai-find-bottle','m',10,20,'ok')`,
    [alice],
  );
});

describe('cloisonnement des caves entre utilisateurs', () => {
  it('Alice voit sa cave, Bob ne la voit pas', async () => {
    expect(await db.asUser(alice, `select id from public.cellars`)).toHaveLength(1);
    expect(await db.asUser(bob, `select id from public.cellars`)).toHaveLength(0);
  });

  it('Bob ne peut ni modifier ni supprimer la cave d’Alice', async () => {
    await db.asUser(bob, `update public.cellars set name = 'piratée' where id = $1`, [aliceCellar]);
    await db.asUser(bob, `delete from public.cellars where id = $1`, [aliceCellar]);
    const rows = await db.asAdmin<{ name: string }>(`select name from public.cellars where id = $1`, [aliceCellar]);
    expect(rows[0]!.name).toBe('Cave d’Alice');
  });

  it('Bob ne peut pas créer une cave au nom d’Alice', async () => {
    await expect(db.asUser(bob, `insert into public.cellars (user_id, name) values ($1, 'x')`, [alice])).rejects.toThrow();
  });

  it('Alice peut créer sa propre cave', async () => {
    const rows = await db.asUser(alice, `insert into public.cellars (user_id, name) values ($1, 'Cave 2') returning id`, [alice]);
    expect(rows).toHaveLength(1);
  });
});

describe('cloisonnement des bouteilles, achats et estimations', () => {
  it('Bob ne voit ni les bouteilles, ni les achats, ni les estimations d’Alice', async () => {
    for (const table of ['bottles', 'purchases', 'valuations_history', 'bottle_photos']) {
      expect(await db.asUser(bob, `select * from public.${table}`)).toHaveLength(0);
    }
    expect(await db.asUser(alice, `select * from public.bottles`)).toHaveLength(1);
    expect(await db.asUser(alice, `select * from public.purchases`)).toHaveLength(1);
  });

  it('Bob ne peut pas ranger une bouteille dans la cave d’Alice', async () => {
    await expect(
      db.asUser(bob, `insert into public.bottles (user_id, cellar_id, rum_id) values ($1,$2,$3)`, [bob, aliceCellar, rum]),
    ).rejects.toThrow();
  });

  it('Bob ne peut pas rattacher un achat à la bouteille d’Alice', async () => {
    await expect(
      db.asUser(bob, `insert into public.purchases (user_id, bottle_id, unit_price) values ($1,$2,1)`, [bob, aliceBottle]),
    ).rejects.toThrow();
  });
});

describe('catalogue partagé des rhums', () => {
  it('est lisible par tout utilisateur connecté mais pas par un anonyme', async () => {
    expect((await db.asUser(bob, `select id from public.rums`)).length).toBeGreaterThan(0);
    await expect(db.asAnon(`select id from public.rums`)).rejects.toThrow();
  });

  it('un utilisateur peut ajouter un rhum, tracé à son nom', async () => {
    const rows = await db.asUser<{ created_by: string }>(
      bob,
      `insert into public.rums (distillery, cuvee_name, country, created_by) values ('Clément','10 ans','Martinique',$1) returning created_by`,
      [bob],
    );
    expect(rows[0]!.created_by).toBe(bob);
  });

  it('un utilisateur ne peut pas usurper l’auteur d’un rhum', async () => {
    await expect(
      db.asUser(bob, `insert into public.rums (distillery, cuvee_name, country, created_by) values ('X','Y','Z',$1)`, [alice]),
    ).rejects.toThrow();
  });

  it('seul un admin peut modifier ou supprimer un rhum du catalogue', async () => {
    await db.asUser(bob, `update public.rums set cuvee_name = 'modifié' where id = $1`, [rum]);
    let rows = await db.asAdmin<{ cuvee_name: string }>(`select cuvee_name from public.rums where id = $1`, [rum]);
    expect(rows[0]!.cuvee_name).toBe('LROK 2010');

    await db.asUser(admin, `update public.rums set region = 'Trelawny' where id = $1`, [rum]);
    rows = await db.asAdmin(`select region from public.rums where id = $1`, [rum]);
    expect(rows[0]).toMatchObject({ region: 'Trelawny' });
  });
});

describe('rôle admin vérifié côté serveur', () => {
  it('un utilisateur ne voit que sa propre consommation IA', async () => {
    expect(await db.asUser(alice, `select * from public.ai_usage`)).toHaveLength(1);
    expect(await db.asUser(bob, `select * from public.ai_usage`)).toHaveLength(0);
  });

  it('un admin voit la consommation IA de tous', async () => {
    expect(await db.asUser(admin, `select * from public.ai_usage`)).toHaveLength(1);
  });

  it('un utilisateur ne peut pas s’attribuer le rôle admin', async () => {
    await expect(db.asUser(bob, `insert into public.user_roles (user_id, role) values ($1, 'admin')`, [bob])).rejects.toThrow();
  });

  it('un utilisateur ne voit que son profil, un admin voit tous les profils', async () => {
    expect(await db.asUser(bob, `select id from public.profiles`)).toHaveLength(1);
    expect((await db.asUser(admin, `select id from public.profiles`)).length).toBe(3);
  });

  it('un utilisateur ne peut pas écrire directement dans ai_usage', async () => {
    await expect(
      db.asUser(bob, `insert into public.ai_usage (user_id, function_name, model, status) values ($1,'x','y','ok')`, [bob]),
    ).rejects.toThrow();
  });
});

describe('stockage privé des photos et factures', () => {
  it('les buckets sont privés', async () => {
    const rows = await db.asAdmin<{ id: string; public: boolean }>(`select id, public from storage.buckets order by id`);
    expect(rows).toEqual([
      { id: 'bottle-photos', public: false },
      { id: 'invoices', public: false },
    ]);
  });

  it('un utilisateur n’écrit que dans son dossier', async () => {
    await expect(
      db.asUser(alice, `insert into storage.objects (bucket_id, name) values ('bottle-photos', $1)`, [`${alice}/photo.jpg`]),
    ).resolves.toBeDefined();
    await expect(
      db.asUser(bob, `insert into storage.objects (bucket_id, name) values ('bottle-photos', $1)`, [`${alice}/intrus.jpg`]),
    ).rejects.toThrow();
  });

  it('un utilisateur ne lit pas les fichiers d’un autre', async () => {
    expect(await db.asUser(bob, `select * from storage.objects`)).toHaveLength(0);
    expect(await db.asUser(alice, `select * from storage.objects`)).toHaveLength(1);
  });
});
