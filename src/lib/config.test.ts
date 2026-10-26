import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

describe('readConfig', () => {
  it('retourne la configuration Supabase quand elle est complète', () => {
    expect(readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'cle' })).toEqual({
      ok: true,
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'cle',
    });
  });

  it('liste les variables manquantes', () => {
    expect(readConfig({ VITE_SUPABASE_URL: '' })).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    });
  });

  it('refuse une URL invalide', () => {
    expect(readConfig({ VITE_SUPABASE_URL: 'abc', VITE_SUPABASE_ANON_KEY: 'cle' })).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_URL'],
    });
  });
});
