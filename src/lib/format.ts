// Affichage uniquement : les montants arrivent en chaîne décimale exacte depuis la base.
// Aucun calcul monétaire n'est fait côté client.
export function formatMoney(amount: string | null | undefined, currency = 'EUR'): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
    .format(Number(amount))
    .replace(/[\u202f\u00a0]/g, ' ');
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(date));
}
