import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Client Supabase unique, créé à la première utilisation (les tests n'en ont pas besoin). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (voir .env.example)');
  }
  client = createClient(url, key);
  return client;
}

/** Transforme une erreur Supabase en Error, pour que les écrans n'aient qu'un seul cas à gérer. */
export function raise(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}
