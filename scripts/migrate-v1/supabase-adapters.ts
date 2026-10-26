// Branchement des interfaces de migration sur les projets Supabase v1 et v2.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { V1Reader } from './extract';
import type { LoadCounts, V2Writer } from './load';
import type { ReportItem } from './types';

export async function signIn(url: string, anonKey: string, email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Connexion impossible à ${url} : ${error?.message ?? 'utilisateur absent'}`);
  return { client, userId: data.user.id };
}

export function supabaseReader(client: SupabaseClient, userId: string): V1Reader {
  return {
    async page(table, select, from, to) {
      const { data, error } = await client
        .from(table)
        .select(select)
        // Les tables v1 portant user_id sont filtrées explicitement ; valuations_history passe par la RLS v1.
        .match(table === 'valuations_history' ? {} : { user_id: userId })
        .order('id', { ascending: true })
        .range(from, to);
      return { data, error: error ? { message: error.message } : null };
    },
  };
}

export function supabaseWriter(client: SupabaseClient, userId: string): V2Writer {
  return {
    userId,

    async upsert(table, rows, options = {}) {
      if (rows.length === 0) return [];
      const { error } = await client
        .from(table)
        .upsert(rows, { onConflict: 'legacy_id', ignoreDuplicates: options.ignoreDuplicates ?? false });
      if (error) throw new Error(`Écriture ${table} : ${error.message}`);
      const { data, error: readError } = await client
        .from(table)
        .select('id, legacy_id')
        .in(
          'legacy_id',
          rows.map((r) => r.legacy_id as string),
        );
      if (readError) throw new Error(`Relecture ${table} : ${readError.message}`);
      return data as { id: string; legacy_id: string }[];
    },

    async copyPhoto(sourceUrl, destinationPath) {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.arrayBuffer();
      const { error } = await client.storage.from('bottle-photos').upload(destinationPath, body, {
        upsert: true,
        contentType: response.headers.get('content-type') ?? 'image/jpeg',
      });
      if (error) throw new Error(error.message);
    },

    async startRun() {
      const { data, error } = await client.from('migration_runs').insert({ user_id: userId }).select('id').single();
      if (error) throw new Error(`Création du rapport : ${error.message}`);
      return data.id as string;
    },

    async recordItems(runId: string, items: ReportItem[]) {
      for (let start = 0; start < items.length; start += 500) {
        const { error } = await client.from('migration_items').insert(
          items.slice(start, start + 500).map((i) => ({
            run_id: runId,
            user_id: userId,
            entity: i.entity,
            legacy_id: i.legacy_id,
            status: i.status,
            message: i.message ?? null,
          })),
        );
        if (error) throw new Error(`Enregistrement du rapport : ${error.message}`);
      }
    },

    async finishRun(runId: string, summary: LoadCounts) {
      const { error } = await client
        .from('migration_runs')
        .update({ finished_at: new Date().toISOString(), summary })
        .eq('id', runId);
      if (error) throw new Error(`Clôture du rapport : ${error.message}`);
    },
  };
}
