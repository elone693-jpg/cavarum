import { getSupabase, raise } from '@/lib/supabase';

export type CellarType = 'personal' | 'professional';

export type CellarSummary = {
  id: string;
  name: string;
  type: CellarType;
  location: string | null;
  bottle_units: number;
  /** Montant décimal exact calculé en base. */
  purchase_total: string;
};

export async function listCellarSummaries(): Promise<CellarSummary[]> {
  const { data, error } = await getSupabase()
    .from('cellar_summaries')
    .select('id, name, type, location, bottle_units, purchase_total::text')
    .order('created_at', { ascending: true });
  raise(error);
  return (data ?? []) as unknown as CellarSummary[];
}

export type CollectionSummary = { cellar_count: number; bottle_units: number; purchase_total: string };

export async function getCollectionSummary(): Promise<CollectionSummary> {
  const { data, error } = await getSupabase()
    .from('collection_summary')
    .select('cellar_count, bottle_units, purchase_total::text')
    .single();
  raise(error);
  return data as unknown as CollectionSummary;
}

export async function createCellar(input: { name: string; type: CellarType; location: string | null }) {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Session expirée, reconnectez-vous');
  const { error } = await supabase.from('cellars').insert({ ...input, user_id: auth.user.id });
  raise(error);
}

export async function deleteCellar(id: string) {
  const { error } = await getSupabase().from('cellars').delete().eq('id', id);
  raise(error);
}
