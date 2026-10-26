import { describe, expect, it } from 'vitest';
import { renderReport } from './report';

describe('renderReport', () => {
  const input = {
    generatedAt: '2026-10-26T12:00:00Z',
    dryRun: false,
    source: { cellars: 2, bottles: 3, bottle_units: 5, photos: 2 },
    counts: { cellars: 2, rums: 2, bottles: 3, bottle_units: 5, purchases: 3, valuations: 4, photos: 1 },
    unreadableTables: ['valuations_history (permission denied)'],
    report: [
      { entity: 'cellar' as const, legacy_id: 'c-1', status: 'imported' as const },
      { entity: 'photo' as const, legacy_id: 'photo:b-1', status: 'skipped' as const, message: 'Photo v1 inaccessible : HTTP 404' },
      { entity: 'purchase' as const, legacy_id: 'purchase:b-2', status: 'to_review' as const, message: 'Prix d’achat à 0 €' },
    ],
  };

  it('compare les comptes v1 et v2 et signale les écarts', () => {
    const md = renderReport(input);
    expect(md).toContain('| Caves | 2 | 2 | ✅ |');
    expect(md).toContain('| Bouteilles (unités) | 5 | 5 | ✅ |');
    expect(md).toContain('| Photos | 2 | 1 | ⚠️ |');
  });

  it('liste les éléments ignorés et à vérifier avec leur motif', () => {
    const md = renderReport(input);
    expect(md).toContain('## Ignorés (1)');
    expect(md).toContain('- photo `photo:b-1` — Photo v1 inaccessible : HTTP 404');
    expect(md).toContain('## À vérifier (1)');
    expect(md).toContain('- purchase `purchase:b-2` — Prix d’achat à 0 €');
  });

  it('signale les tables v1 illisibles', () => {
    expect(renderReport(input)).toContain('- valuations_history (permission denied)');
  });

  it('indique clairement un passage à blanc', () => {
    expect(renderReport({ ...input, dryRun: true })).toContain('Passage à blanc : aucune donnée écrite');
  });
});
