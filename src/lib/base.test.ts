import { describe, expect, it } from 'vitest';
import { appUrl, withBase } from './base';

describe('withBase', () => {
  it('préfixe un chemin par le sous-dossier de publication', () => {
    expect(withBase('icon.svg', '/cavarum/')).toBe('/cavarum/icon.svg');
    expect(withBase('/icon.svg', '/cavarum/')).toBe('/cavarum/icon.svg');
  });

  it('fonctionne à la racine', () => {
    expect(withBase('/sw.js', '/')).toBe('/sw.js');
  });
});

describe('appUrl', () => {
  it('construit une URL absolue pour les liens envoyés par email', () => {
    expect(appUrl('reset-password', '/cavarum/', 'https://elone693-jpg.github.io')).toBe(
      'https://elone693-jpg.github.io/cavarum/reset-password',
    );
    expect(appUrl('', '/', 'http://localhost:5173')).toBe('http://localhost:5173/');
  });
});
