import { cn } from '@/lib/utils';
import { statusLabel, type BottleStatus } from './status';

const TONES: Partial<Record<BottleStatus, string>> = {
  in_cellar: 'bg-primary/15 text-primary',
  open: 'bg-amber-500/20 text-amber-300',
  ordered: 'bg-sky-500/15 text-sky-300',
  in_transit: 'bg-sky-500/15 text-sky-300',
};

export function StatusBadge({ status }: { status: BottleStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
