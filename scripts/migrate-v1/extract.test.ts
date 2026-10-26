import { describe, expect, it } from 'vitest';
import { extractSnapshot, fetchAll, type V1Reader } from './extract';

describe('fetchAll', () => {
  it('lit toutes les pages, au-delà de la limite de 5 000 de la v1', async () => {
    const data = Array.from({ length: 12_345 }, (_, i) => ({ i }));
    const calls: [number, number][] = [];
    const rows = await fetchAll(async (from, to) => {
      calls.push([from, to]);
      return { data: data.slice(from, to + 1), error: null };
    }, 5000);
    expect(rows).toHaveLength(12_345);
    expect(calls).toEqual([
      [0, 4999],
      [5000, 9999],
      [10000, 14999],
    ]);
  });

  it('propage une erreur de lecture', async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: 'boom' } }), 10)).rejects.toThrow('boom');
  });
});

function reader(tables: Record<string, unknown[] | Error>): V1Reader {
  return {
    async page(table, _select, from, to) {
      const rows = tables[table];
      if (rows instanceof Error) return { data: null, error: { message: rows.message } };
      return { data: (rows ?? []).slice(from, to + 1), error: null };
    },
  };
}

describe('extractSnapshot', () => {
  const rum = { id: 'rum-1', distillery: 'Neisson' };

  it('extrait caves, bouteilles, rhums liés et historique', async () => {
    const snapshot = await extractSnapshot(
      reader({
        cellars: [{ id: 'c-1' }],
        bottles: [
          { id: 'b-1', rum_id: 'rum-1', rums: rum },
          { id: 'b-2', rum_id: 'rum-1', rums: rum },
        ],
        valuations_history: [{ bottle_id: 'b-1', estimated_value: 10 }],
      }),
      () => '2026-10-26T12:00:00Z',
    );
    expect(snapshot.extracted_at).toBe('2026-10-26T12:00:00Z');
    expect(snapshot.cellars).toEqual([{ id: 'c-1' }]);
    expect(snapshot.bottles).toEqual([
      { id: 'b-1', rum_id: 'rum-1' },
      { id: 'b-2', rum_id: 'rum-1' },
    ]);
    expect(snapshot.rums).toEqual([rum]);
    expect(snapshot.valuations).toHaveLength(1);
    expect(snapshot.unreadable_tables).toEqual([]);
  });

  it('note une table illisible sans interrompre l’extraction', async () => {
    const snapshot = await extractSnapshot(
      reader({ cellars: [], bottles: [], valuations_history: new Error('permission denied') }),
    );
    expect(snapshot.valuations).toEqual([]);
    expect(snapshot.unreadable_tables).toEqual(['valuations_history (permission denied)']);
  });

  it('échoue si les bouteilles sont illisibles, car la migration serait vide', async () => {
    await expect(extractSnapshot(reader({ cellars: [], bottles: new Error('permission denied') }))).rejects.toThrow(
      'permission denied',
    );
  });
});
