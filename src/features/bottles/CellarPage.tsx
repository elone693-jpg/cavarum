import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MapPin, Wine } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BottleGlyph } from '@/components/BottleGlyph';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/field';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/layout';
import { getCellar, listCellarBottles } from './bottles-api';
import { BOTTLE_STATUSES, statusLabel, type BottleStatus } from './status';
import { StatusBadge } from './StatusBadge';

export function CellarPage() {
  const { cellarId = '' } = useParams();
  const [status, setStatus] = useState<BottleStatus | null>(null);

  const cellar = useQuery({ queryKey: ['cellar', cellarId], queryFn: () => getCellar(cellarId) });
  const bottles = useInfiniteQuery({
    queryKey: ['cellar-bottles', cellarId, status],
    queryFn: ({ pageParam }) => listCellarBottles(cellarId, { status, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
  });
  const items = bottles.data?.pages.flatMap((p) => p.items) ?? [];

  if (cellar.data === null) {
    return (
      <EmptyState icon={Wine} title="Cave introuvable" action={<BackLink />}>
        Cette cave n’existe pas ou ne vous appartient pas.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        eyebrow="Cave"
        title={cellar.data?.name ?? <Skeleton className="h-10 w-64" />}
        description={
          cellar.data?.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {cellar.data.location}
            </span>
          )
        }
        actions={
          <div className="w-44 sm:w-52">
            <SelectField
              label="Statut"
              value={status ?? ''}
              onChange={(e) => setStatus((e.target.value || null) as BottleStatus | null)}
            >
              <option value="">Tous les statuts</option>
              {BOTTLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </SelectField>
          </div>
        }
      />

      {bottles.isError && (
        <ErrorState title="Impossible de charger les bouteilles" error={bottles.error} onRetry={() => bottles.refetch()} />
      )}

      {bottles.isPending && (
        <div className="surface divide-y divide-border" aria-busy="true" aria-label="Chargement des bouteilles">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-14 w-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {bottles.isSuccess && items.length === 0 && (
        <EmptyState icon={Wine} title={status ? `Aucune bouteille « ${statusLabel(status)} »` : 'Aucune bouteille dans cette cave'}>
          {status ? 'Essayez un autre statut.' : 'Les bouteilles ajoutées à cette cave apparaîtront ici.'}
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="surface divide-y divide-border overflow-hidden">
          {items.map((bottle) => (
            <li key={bottle.id}>
              <Link
                to={`/bottles/${bottle.id}`}
                className="group flex min-h-[76px] items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-raised sm:px-5"
              >
                <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60">
                  <BottleGlyph className="h-11" tone={['sold', 'empty', 'lost', 'gifted', 'exchanged'].includes(bottle.status) ? 'muted' : 'primary'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {bottle.rum.distillery}
                  </span>
                  <span className="sr-only"> — </span>
                  <span className="block truncate font-serif text-lg font-semibold leading-snug">{bottle.rum.cuvee_name}</span>
                  <span className="numeric mt-0.5 block truncate text-xs text-muted-foreground">
                    {[bottle.rum.vintage, bottle.rum.abv && `${bottle.rum.abv} %`, bottle.cask_number && `Fût n°${bottle.cask_number}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <StatusBadge status={bottle.status} />
                  {bottle.quantity > 1 && <span className="numeric text-sm text-muted-foreground">×{bottle.quantity}</span>}
                </span>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {bottles.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => bottles.fetchNextPage()} disabled={bottles.isFetchingNextPage}>
            {bottles.isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
          </Button>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/cellars"
      className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Mes caves
    </Link>
  );
}
