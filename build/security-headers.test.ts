import { describe, expect, it } from 'vitest';
import { buildCsp, headersFile, securityHeaders } from './security-headers';

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(';').map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    }),
  );

describe('buildCsp', () => {
  const csp = directives(buildCsp('https://abcd.supabase.co'));

  it('n’autorise que les scripts de l’application', () => {
    expect(csp['script-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
  });

  it('autorise Supabase (API, temps réel, images signées) et rien d’autre en externe', () => {
    expect(csp['connect-src']).toEqual(["'self'", 'https://abcd.supabase.co', 'wss://abcd.supabase.co']);
    expect(csp['img-src']).toEqual(["'self'", 'data:', 'blob:', 'https://abcd.supabase.co']);
    expect(csp['font-src']).toEqual(["'self'"]);
  });

  it('interdit l’affichage dans un cadre et force HTTPS', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp).toHaveProperty('upgrade-insecure-requests');
  });

  it('peut omettre frame-ancestors pour la balise meta, où il est ignoré', () => {
    expect(buildCsp('https://abcd.supabase.co', { forMeta: true })).not.toContain('frame-ancestors');
  });

  it('ne force pas HTTPS pour un Supabase local en http', () => {
    const local = directives(buildCsp('http://127.0.0.1:54321'));
    expect(local).not.toHaveProperty('upgrade-insecure-requests');
    expect(local['connect-src']).toEqual(["'self'", 'http://127.0.0.1:54321', 'ws://127.0.0.1:54321']);
  });

  it('refuse une URL Supabase invalide', () => {
    expect(() => buildCsp('pas une url')).toThrow('VITE_SUPABASE_URL invalide');
  });
});

describe('securityHeaders', () => {
  it('fournit les en-têtes attendus d’une application commerciale', () => {
    const headers = securityHeaders('https://abcd.supabase.co');
    expect(headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    expect(headers['Permissions-Policy']).toContain('camera=(self)');
    expect(headers['Permissions-Policy']).toContain('geolocation=()');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });
});

describe('headersFile', () => {
  it('produit un fichier _headers (Netlify / Cloudflare Pages) avec cache long des assets', () => {
    const file = headersFile('https://abcd.supabase.co');
    expect(file).toMatch(/^\/\*\n {2}X-Content-Type-Options: nosniff\n/);
    expect(file).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
    expect(file).toContain('/sw.js\n  Cache-Control: no-cache');
  });
});
