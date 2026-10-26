import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_DIR = path.resolve(__dirname, '../..');

export type TestDb = {
  pg: PGlite;
  /** Exécute une requête en tant qu'utilisateur authentifié (RLS appliquée). */
  asUser<T = Record<string, unknown>>(userId: string, sql: string, params?: unknown[]): Promise<T[]>;
  /** Exécute une requête en tant que visiteur anonyme (RLS appliquée). */
  asAnon<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Exécute une requête en superutilisateur (RLS ignorée), pour préparer les données. */
  asAdmin<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  createUser(email: string): Promise<string>;
};

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(readFileSync(path.join(SUPABASE_DIR, 'tests/supabase-stub.sql'), 'utf8'));

  const migrationsDir = path.join(SUPABASE_DIR, 'migrations');
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await pg.exec(readFileSync(path.join(migrationsDir, file), 'utf8'));
  }

  async function runAs<T>(role: 'authenticated' | 'anon', userId: string | null, sql: string, params: unknown[]): Promise<T[]> {
    const rows = await pg.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
      const result = await tx.query<T>(sql, params);
      return result.rows;
    });
    return rows ?? [];
  }

  return {
    pg,
    asUser: (userId, sql, params = []) => runAs('authenticated', userId, sql, params),
    asAnon: (sql, params = []) => runAs('anon', null, sql, params),
    asAdmin: async (sql, params = []) => (await pg.query(sql, params)).rows as never,
    createUser: async (email) => {
      const { rows } = await pg.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, '{"name":"Test"}') returning id`,
        [email],
      );
      return rows[0]!.id;
    },
  };
}
