import { getSupabase, raise } from '@/lib/supabase';
import type { BottleStatus } from './status';

export const PAGE_SIZE = 30;

export type BottleListItem = {
  id: string;
  status: BottleStatus;
  quantity: number;
  cask_number: string | null;
  rum: { distillery: string; cuvee_name: string; vintage: number | null; abv: string | null };
};

export type BottleDetail = {
  id: string;
  cellar_id: string;
  status: BottleStatus;
  quantity: number;
  cask_number: string | null;
  batch: string | null;
  bottle_number: string | null;
  location_text: string | null;
  notes: string | null;
  rum: {
    distillery: string;
    cuvee_name: string;
    bottler: string | null;
    brand: string | null;
    country: string;
    region: string | null;
    vintage: number | null;
    age: number | null;
    abv: string | null;
    volume_ml: number;
  };
  cellar: { name: string };
  purchases: { purchased_on: string | null; seller: string | null; unit_price: string | null; currency: string }[];
  photos: { storage_path: string }[];
  valuations: { value: string; currency: string; kind: 'manual' | 'legacy'; source: string | null; valued_at: string }[];
};

export async function getCellar(id: string): Promise<{ id: string; name: string; location: string | null } | null> {
  const { data, error } = await getSupabase().from('cellars').select('id, name, location').eq('id', id).maybeSingle();
  raise(error);
  return data;
}

export async function listCellarBottles(
  cellarId: string,
  { status, page }: { status: BottleStatus | null; page: number },
): Promise<{ items: BottleListItem[]; hasMore: boolean }> {
  let query = getSupabase()
    .from('bottles')
    .select('id, status, quantity, cask_number, rum:rums(distillery, cuvee_name, vintage, abv::text)')
    .eq('cellar_id', cellarId);
  if (status) query = query.eq('status', status);
  const from = page * PAGE_SIZE;
  // Une ligne de plus que la page pour savoir s'il en reste.
  const { data, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE);
  raise(error);
  const rows = (data ?? []) as unknown as BottleListItem[];
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getBottle(id: string): Promise<BottleDetail | null> {
  const { data, error } = await getSupabase()
    .from('bottles')
    .select(
      `id, cellar_id, status, quantity, cask_number, batch, bottle_number, location_text, notes,
       rum:rums(distillery, cuvee_name, bottler, brand, country, region, vintage, age, abv::text, volume_ml),
       cellar:cellars(name),
       purchases(purchased_on, seller, unit_price::text, currency),
       photos:bottle_photos(storage_path),
       valuations:valuations_history(value::text, currency, kind, source, valued_at)`,
    )
    .eq('id', id)
    .maybeSingle();
  raise(error);
  if (!data) return null;
  const detail = data as unknown as BottleDetail;
  detail.valuations.sort((a, b) => b.valued_at.localeCompare(a.valued_at));
  return detail;
}

/** Les photos sont privées : affichage via URLs signées valables une heure. */
export async function getPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await getSupabase().storage.from('bottle-photos').createSignedUrls(paths, 3600);
  raise(error);
  return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []));
}
