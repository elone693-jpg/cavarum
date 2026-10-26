// Lecture paginée des données v1 de l'utilisateur connecté.
import type { V1Bottle, V1Cellar, V1Rum, V1Snapshot, V1Valuation } from './types';

type PageResult = { data: unknown[] | null; error: { message: string } | null };

export interface V1Reader {
  /** Lit les lignes [from, to] (bornes incluses) d'une table. */
  page(table: string, select: string, from: number, to: number): Promise<PageResult>;
}

const PAGE_SIZE = 1000;

export async function fetchAll<T>(fetchPage: (from: number, to: number) => Promise<PageResult>, pageSize = PAGE_SIZE) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function extractSnapshot(reader: V1Reader, now: () => string = () => new Date().toISOString()): Promise<V1Snapshot> {
  const unreadable: string[] = [];
  const read = <T>(table: string, select: string) => fetchAll<T>((from, to) => reader.page(table, select, from, to));

  const cellars = await read<V1Cellar>('cellars', '*');
  // Les rhums sont lus via les bouteilles : inutile de parcourir tout le catalogue partagé.
  const bottlesWithRums = await read<V1Bottle & { rums: V1Rum | null }>('bottles', '*, rums(*)');

  let valuations: V1Valuation[] = [];
  try {
    valuations = await read<V1Valuation>('valuations_history', '*');
  } catch (error) {
    unreadable.push(`valuations_history (${error instanceof Error ? error.message : String(error)})`);
  }

  const rums = new Map<string, V1Rum>();
  const bottles: V1Bottle[] = bottlesWithRums.map(({ rums: rum, ...bottle }) => {
    if (rum) rums.set(rum.id, rum);
    return bottle;
  });

  return {
    extracted_at: now(),
    cellars,
    rums: [...rums.values()],
    bottles,
    valuations,
    unreadable_tables: unreadable,
  };
}
