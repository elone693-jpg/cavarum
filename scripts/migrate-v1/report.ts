// Rapport de migration lisible (Markdown).
import type { LoadCounts } from './load';
import type { ReportItem } from './types';

export type SourceCounts = { cellars: number; bottles: number; bottle_units: number; photos: number };

export type ReportInput = {
  generatedAt: string;
  dryRun: boolean;
  source: SourceCounts;
  counts: LoadCounts;
  unreadableTables: string[];
  report: ReportItem[];
};

function line(label: string, v1: number, v2: number) {
  return `| ${label} | ${v1} | ${v2} | ${v1 === v2 ? '✅' : '⚠️'} |`;
}

function list(items: ReportItem[]) {
  return items.map((i) => `- ${i.entity} \`${i.legacy_id}\` — ${i.message ?? ''}`).join('\n');
}

export function renderReport(input: ReportInput): string {
  const skipped = input.report.filter((r) => r.status === 'skipped');
  const toReview = input.report.filter((r) => r.status === 'to_review');
  const imported = input.report.filter((r) => r.status === 'imported');

  return [
    `# Rapport de migration Cavarum v1 → v2`,
    '',
    `Généré le ${input.generatedAt}.`,
    input.dryRun ? '\n> **Passage à blanc : aucune donnée écrite.** Les colonnes v2 indiquent ce qui serait importé.\n' : '',
    '## Comptes',
    '',
    '| Élément | v1 | v2 | |',
    '|---|---|---|---|',
    line('Caves', input.source.cellars, input.counts.cellars),
    line('Bouteilles (lignes)', input.source.bottles, input.counts.bottles),
    line('Bouteilles (unités)', input.source.bottle_units, input.counts.bottle_units),
    line('Photos', input.source.photos, input.counts.photos),
    '',
    `Rhums repris : ${input.counts.rums} · Achats : ${input.counts.purchases} · Estimations : ${input.counts.valuations} · Éléments importés : ${imported.length}`,
    '',
    `## Ignorés (${skipped.length})`,
    '',
    skipped.length ? list(skipped) : 'Aucun.',
    '',
    `## À vérifier (${toReview.length})`,
    '',
    toReview.length ? list(toReview) : 'Aucun.',
    '',
    '## Tables v1 illisibles',
    '',
    input.unreadableTables.length ? input.unreadableTables.map((t) => `- ${t}`).join('\n') : 'Aucune.',
    '',
  ].join('\n');
}
