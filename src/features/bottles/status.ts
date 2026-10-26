export const BOTTLE_STATUSES = [
  'ordered',
  'in_transit',
  'in_cellar',
  'open',
  'empty',
  'sold',
  'gifted',
  'exchanged',
  'lost',
] as const;

export type BottleStatus = (typeof BOTTLE_STATUSES)[number];

const LABELS: Record<BottleStatus, string> = {
  ordered: 'Commandée',
  in_transit: 'En transit',
  in_cellar: 'En cave',
  open: 'Ouverte',
  empty: 'Vide',
  sold: 'Vendue',
  gifted: 'Offerte',
  exchanged: 'Échangée',
  lost: 'Perdue / cassée',
};

export function statusLabel(status: BottleStatus): string {
  return LABELS[status];
}
