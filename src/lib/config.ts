export type AppConfig =
  | { ok: true; supabaseUrl: string; supabaseAnonKey: string }
  | { ok: false; missing: string[] };

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Vérifie au démarrage que l'app est configurée, pour afficher un écran clair plutôt qu'une page blanche. */
export function readConfig(env: Record<string, string | undefined> = import.meta.env): AppConfig {
  const url = env.VITE_SUPABASE_URL ?? '';
  const key = env.VITE_SUPABASE_ANON_KEY ?? '';
  const missing = [...(isUrl(url) ? [] : ['VITE_SUPABASE_URL']), ...(key ? [] : ['VITE_SUPABASE_ANON_KEY'])];
  return missing.length > 0 ? { ok: false, missing } : { ok: true, supabaseUrl: url, supabaseAnonKey: key };
}
