import { getSupabase, raise } from '@/lib/supabase';

const EXPORTED_TABLES = [
  'profiles',
  'cellars',
  'storage_locations',
  'bottles',
  'purchases',
  'valuations_history',
  'bottle_photos',
] as const;

const STORAGE_BATCH = 100;

async function currentUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  raise(error);
  if (!data.user) throw new Error('Session expirée, reconnectez-vous');
  return data.user.id;
}

export async function getProfile(): Promise<{ name: string | null; email: string | null }> {
  const id = await currentUserId();
  const { data, error } = await getSupabase().from('profiles').select('name, email').eq('id', id).single();
  raise(error);
  return { name: data?.name ?? null, email: data?.email ?? null };
}

/** Droit à la portabilité : toutes les données de l'utilisateur, lisibles par machine. */
export async function exportMyData(): Promise<Record<string, unknown>> {
  await currentUserId();
  const supabase = getSupabase();
  const result: Record<string, unknown> = { exported_at: new Date().toISOString(), format: 'cavarum-export-v1' };
  for (const table of EXPORTED_TABLES) {
    // La RLS limite chaque lecture aux lignes de l'utilisateur connecté.
    const { data, error } = await supabase.from(table).select('*');
    raise(error);
    result[table] = data ?? [];
  }
  return result;
}

async function removeFiles(bucket: string, paths: string[]) {
  for (let start = 0; start < paths.length; start += STORAGE_BATCH) {
    const { error } = await getSupabase().storage.from(bucket).remove(paths.slice(start, start + STORAGE_BATCH));
    raise(error);
  }
}

/** Droit à l'effacement : fichiers d'abord (via l'API Storage), puis compte et données en cascade. */
export async function deleteMyAccount(): Promise<void> {
  await currentUserId();
  const supabase = getSupabase();

  const photos = await supabase.from('bottle_photos').select('storage_path');
  raise(photos.error);
  const invoices = await supabase.from('purchases').select('invoice_path').not('invoice_path', 'is', null);
  raise(invoices.error);

  await removeFiles('bottle-photos', (photos.data ?? []).map((p) => p.storage_path as string));
  await removeFiles('invoices', (invoices.data ?? []).map((p) => p.invoice_path as string));

  const { error } = await supabase.rpc('delete_my_account');
  raise(error);
  await supabase.auth.signOut({ scope: 'local' });
}
