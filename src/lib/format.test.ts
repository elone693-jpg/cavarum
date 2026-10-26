import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

describe('formatMoney', () => {
  it('affiche un montant décimal en euros, format français', () => {
    expect(formatMoney('1234.5')).toBe('1 234,50 €');
    expect(formatMoney('0.10', 'EUR')).toBe('0,10 €');
  });

  it('affiche un tiret pour un montant absent', () => {
    expect(formatMoney(null)).toBe('—');
  });
});
