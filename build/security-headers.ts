// Politique de sécurité HTTP de l'application, calculée au build à partir de l'URL Supabase.
// Seul Supabase est autorisé comme origine externe : polices et scripts sont servis par l'app.

function supabaseOrigin(url: string): URL {
  try {
    return new URL(url);
  } catch {
    throw new Error(`VITE_SUPABASE_URL invalide : « ${url} »`);
  }
}

export function buildCsp(supabaseUrl: string, { forMeta = false }: { forMeta?: boolean } = {}): string {
  const origin = supabaseOrigin(supabaseUrl);
  const http = origin.origin;
  const socket = `${origin.protocol === 'https:' ? 'wss' : 'ws'}://${origin.host}`;

  const directives: [string, ...string[]][] = [
    ['default-src', "'self'"],
    ['script-src', "'self'"],
    // Styles en ligne : attributs style de React et feuille injectée par les notifications.
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:', http],
    ['font-src', "'self'"],
    ['connect-src', "'self'", http, socket],
    ['manifest-src', "'self'"],
    ['worker-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
  ];
  // frame-ancestors est ignoré dans une balise meta : il n'a de sens qu'en en-tête HTTP.
  if (!forMeta) directives.push(['frame-ancestors', "'none'"]);
  if (origin.protocol === 'https:') directives.push(['upgrade-insecure-requests']);

  return directives.map((d) => d.join(' ')).join('; ');
}

export function securityHeaders(supabaseUrl: string): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // Caméra réservée à l'app (scan d'étiquette prévu au jalon 5), le reste est coupé.
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Content-Security-Policy': buildCsp(supabaseUrl),
  };
}

/** Fichier `_headers` compris par Netlify et Cloudflare Pages. */
export function headersFile(supabaseUrl: string): string {
  const global = Object.entries(securityHeaders(supabaseUrl))
    .map(([name, value]) => `  ${name}: ${value}`)
    .join('\n');
  return [
    `/*\n${global}`,
    '/assets/*\n  Cache-Control: public, max-age=31536000, immutable',
    '/sw.js\n  Cache-Control: no-cache',
    '/index.html\n  Cache-Control: no-cache',
    '',
  ].join('\n\n');
}
