import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, wide = false }: { label: string; value: ReactNode; hint?: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0 space-y-1 bg-surface px-4 py-3.5 sm:px-5', wide && 'col-span-2 sm:col-span-1')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric whitespace-nowrap font-serif text-2xl font-semibold text-foreground sm:text-[1.75rem]">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Grille de chiffres clés : deux colonnes sur mobile (le dernier, un montant, passe en pleine largeur), trois au-delà. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-3">{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-md bg-muted/70', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-border-strong px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-serif text-xl font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}

/** Erreur de chargement avec une action de récupération. */
export function ErrorState({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-5">
      <div>
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-sm text-foreground/80">{error.message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-10 items-center rounded-[10px] border border-destructive/50 px-3.5 text-sm font-medium text-foreground hover:bg-destructive/15"
      >
        Réessayer
      </button>
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('surface space-y-4 p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
