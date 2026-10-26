// Migration Cavarum v1 (Lovable) → v2.
//
//   npm run migrate:v1 -- --dry-run                 lit la v1, écrit l'instantané et le rapport, n'écrit rien en v2
//   npm run migrate:v1                              migration complète (rejouable)
//   npm run migrate:v1 -- --from-snapshot <fichier> recharge un instantané existant au lieu de relire la v1
//
// Identifiants lus dans l'environnement uniquement (voir .env.example).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { extractSnapshot } from './extract';
import { loadPlan, type LoadCounts } from './load';
import { renderReport, type SourceCounts } from './report';
import { signIn, supabaseReader, supabaseWriter } from './supabase-adapters';
import { transformSnapshot } from './transform';
import type { MigrationPlan, V1Snapshot } from './types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  return value;
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sourceCounts(snapshot: V1Snapshot): SourceCounts {
  return {
    cellars: snapshot.cellars.length,
    bottles: snapshot.bottles.length,
    bottle_units: snapshot.bottles.reduce((sum, b) => sum + (b.quantity ?? 1), 0),
    photos: snapshot.bottles.filter((b) => b.photo_url).length,
  };
}

function plannedCounts(plan: MigrationPlan): LoadCounts {
  return {
    cellars: plan.cellars.length,
    rums: plan.rums.length,
    bottles: plan.bottles.length,
    bottle_units: plan.bottles.reduce((sum, b) => sum + b.quantity, 0),
    purchases: plan.purchases.length,
    valuations: plan.valuations.length,
    photos: plan.photos.length,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const snapshotFile = argValue('--from-snapshot');
  const outDir = path.resolve(argValue('--out') ?? 'migration-output');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(outDir, { recursive: true });

  let snapshot: V1Snapshot;
  if (snapshotFile) {
    snapshot = JSON.parse(readFileSync(snapshotFile, 'utf8')) as V1Snapshot;
    console.log(`Instantané chargé : ${snapshotFile}`);
  } else {
    const v1 = await signIn(env('V1_SUPABASE_URL'), env('V1_SUPABASE_ANON_KEY'), env('V1_EMAIL'), env('V1_PASSWORD'));
    snapshot = await extractSnapshot(supabaseReader(v1.client, v1.userId));
    const file = path.join(outDir, `snapshot-v1-${stamp}.json`);
    writeFileSync(file, JSON.stringify(snapshot, null, 2));
    console.log(`Instantané v1 sauvegardé : ${file}`);
  }

  const plan = transformSnapshot(snapshot);
  let counts = plannedCounts(plan);
  let report = plan.report;

  if (!dryRun) {
    const v2 = await signIn(env('V2_SUPABASE_URL'), env('V2_SUPABASE_ANON_KEY'), env('V2_EMAIL'), env('V2_PASSWORD'));
    const result = await loadPlan(plan, supabaseWriter(v2.client, v2.userId));
    counts = result.counts;
    report = result.report;
  }

  const markdown = renderReport({
    generatedAt: new Date().toISOString(),
    dryRun,
    source: sourceCounts(snapshot),
    counts,
    unreadableTables: snapshot.unreadable_tables,
    report,
  });
  const reportFile = path.join(outDir, `rapport-migration-${stamp}.md`);
  writeFileSync(reportFile, markdown);
  console.log(markdown);
  console.log(`Rapport écrit : ${reportFile}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
