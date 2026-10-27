// L'app peut être publiée dans un sous-dossier (GitHub Pages : /cavarum/).
// Vite fournit ce préfixe dans import.meta.env.BASE_URL, toujours terminé par « / ».

export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base}${path.replace(/^\//, '')}`;
}

/** URL absolue d'une page de l'app, pour les liens envoyés par email (confirmation, mot de passe). */
export function appUrl(path: string, base: string = import.meta.env.BASE_URL, origin: string = window.location.origin): string {
  return `${origin}${withBase(path, base)}`;
}
