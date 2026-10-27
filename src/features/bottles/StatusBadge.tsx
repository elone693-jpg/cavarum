import { cn } from '@/lib/utils';
import { statusLabel, type BottleStatus } from './status';

const TONES: Record<BottleStatus, string> = {
  in_cellar: 'border-primary/35 bg-primary/10 text-primary-strong',
  open: 'border-copper/40 bg-copper/10 text-copper',
  ordered: 'border-slate/35 bg-slate/10 text-slate',
  in_transit: 'border-slate/35 bg-slate/10 text-slate',
  sold: 'border-cane/35 bg-cane/10 text-cane',
  gifted: 'border-cane/35 bg-cane/10 text-cane',
  exchanged: 'border-cane/35 bg-cane/10 text-cane',
  empty: 'border-border-strong bg-muted text-muted-foreground',
  lost: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function StatusBadge({ status }: { status: BottleStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[status],
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
