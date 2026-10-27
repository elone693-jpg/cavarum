import { describe, expect, it } from 'vitest';
import { raise } from './supabase';

describe('raise', () => {
  it('ne fait rien sans erreur', () => {
    expect(() => raise(null)).not.toThrow();
  });

  it('transmet le message d’une erreur métier', () => {
    expect(() => raise({ message: 'duplicate key value' })).toThrow('duplicate key value');
  });

  it('traduit les erreurs réseau des différents navigateurs en message compréhensible', () => {
    for (const message of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed']) {
      expect(() => raise({ message })).toThrow('Connexion au serveur impossible : vérifiez votre réseau.');
    }
  });
});
