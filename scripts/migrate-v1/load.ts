// Écriture idempotente d'un plan de migration dans la v2.
// Toutes les écritures passent par legacy_id : une relance met à jour sans dupliquer.
import type { MigrationPlan, ReportItem } from './types';

export type UpsertResult = { id: string; legacy_id: string }[];

export interface V2Writer {
  /** Identifiant de l'utilisateur v2 connecté. */
  userId: string;
  /** Insère ou met à jour sur legacy_id ; retourne l'id v2 de chaque ligne fournie. */
  upsert(table: string, rows: Record<string, unknown>[], options?: { ignoreDuplicates?: boolean }): Promise<UpsertResult>;
  copyPhoto(sourceUrl: string, destinationPath: string): Promise<void>;
  startRun(): Promise<string>;
  recordItems(runId: string, items: ReportItem[]): Promise<void>;
  finishRun(runId: string, summary: LoadCounts): Promise<void>;
}

export type LoadCounts = {
  cellars: number;
  rums: number;
  bottles: number;
  bottle_units: number;
  purchases: number;
  valuations: number;
  photos: number;
};

export type LoadResult = { counts: LoadCounts; report: ReportItem[] };

const BATCH_SIZE = 200;

async function upsertAll(
  writer: V2Writer,
  table: string,
  rows: Record<string, unknown>[],
  options?: { ignoreDuplicates?: boolean },
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const result = await writer.upsert(table, rows.slice(start, start + BATCH_SIZE), options);
    for (const row of result) ids.set(row.legacy_id, row.id);
  }
  return ids;
}

function resolve(ids: Map<string, string>, legacyId: string, what: string): string {
  const id = ids.get(legacyId);
  if (!id) throw new Error(`${what} v2 introuvable pour legacy_id ${legacyId}`);
  return id;
}

export async function loadPlan(plan: MigrationPlan, writer: V2Writer): Promise<LoadResult> {
  const userId = writer.userId;
  const runId = await writer.startRun();
  const report = [...plan.report];

  const cellarIds = await upsertAll(
    writer,
    'cellars',
    plan.cellars.map((c) => ({ ...c, user_id: userId })),
  );

  // Le catalogue est partagé : un rhum déjà présent n'est jamais écrasé.
  const rumIds = await upsertAll(
    writer,
    'rums',
    plan.rums.map((r) => ({ ...r, created_by: userId })),
    { ignoreDuplicates: true },
  );

  const bottleIds = await upsertAll(
    writer,
    'bottles',
    plan.bottles.map(({ cellar_legacy_id, rum_legacy_id, ...b }) => ({
      ...b,
      user_id: userId,
      cellar_id: resolve(cellarIds, cellar_legacy_id, 'Cave'),
      rum_id: resolve(rumIds, rum_legacy_id, 'Rhum'),
    })),
  );

  await upsertAll(
    writer,
    'purchases',
    plan.purchases.map(({ bottle_legacy_id, ...p }) => ({
      ...p,
      user_id: userId,
      bottle_id: resolve(bottleIds, bottle_legacy_id, 'Bouteille'),
    })),
  );

  await upsertAll(
    writer,
    'valuations_history',
    plan.valuations.map(({ bottle_legacy_id, ...v }) => ({
      ...v,
      user_id: userId,
      bottle_id: resolve(bottleIds, bottle_legacy_id, 'Bouteille'),
    })),
  );

  const copiedPhotos: Record<string, unknown>[] = [];
  for (const photo of plan.photos) {
    const storagePath = `${userId}/${photo.relative_path}`;
    try {
      await writer.copyPhoto(photo.source_url, storagePath);
      copiedPhotos.push({
        legacy_id: photo.legacy_id,
        user_id: userId,
        bottle_id: resolve(bottleIds, photo.bottle_legacy_id, 'Bouteille'),
        storage_path: storagePath,
        position: 0,
      });
    } catch (error) {
      const index = report.findIndex((r) => r.entity === 'photo' && r.legacy_id === photo.legacy_id);
      const failure: ReportItem = {
        entity: 'photo',
        legacy_id: photo.legacy_id,
        status: 'skipped',
        message: `Photo v1 inaccessible : ${error instanceof Error ? error.message : String(error)}`,
      };
      if (index >= 0) report[index] = failure;
      else report.push(failure);
    }
  }
  await upsertAll(writer, 'bottle_photos', copiedPhotos);

  const counts: LoadCounts = {
    cellars: cellarIds.size,
    rums: rumIds.size,
    bottles: bottleIds.size,
    bottle_units: plan.bottles.reduce((sum, b) => sum + b.quantity, 0),
    purchases: plan.purchases.length,
    valuations: plan.valuations.length,
    photos: copiedPhotos.length,
  };

  await writer.recordItems(runId, report);
  await writer.finishRun(runId, counts);
  return { counts, report };
}
