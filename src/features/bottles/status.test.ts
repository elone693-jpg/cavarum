import { describe, expect, it } from 'vitest';
import { BOTTLE_STATUSES, statusLabel } from './status';

describe('statuts des bouteilles', () => {
  it('a un libellé français pour chaque statut', () => {
    expect(BOTTLE_STATUSES.map(statusLabel)).toEqual([
      'Commandée',
      'En transit',
      'En cave',
      'Ouverte',
      'Vide',
      'Vendue',
      'Offerte',
      'Échangée',
      'Perdue / cassée',
    ]);
  });
});
