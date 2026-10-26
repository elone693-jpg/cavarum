import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readConfig } from './config';

let client: SupabaseClient | null = null;

/** Client Supabase unique, créé à la première utilisation (les tests n'en ont pas besoin). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const config = readConfig();
  if (!config.ok) throw new Error(`Configuration manquante : ${config.missing.join(', ')} (voir .env.example)`);
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return client;
}

/** Transforme une erreur Supabase en Error, pour que les écrans n'aient qu'un seul cas à gérer. */
export function raise(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}
