import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormError, SelectField } from '@/components/ui/field';
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

  return (
    <section className="space-y-6">
      <Link to="/cellars" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mes caves
      </Link>

      {cellar.data === null ? (
        <p>Cave introuvable</p>
      ) : (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">{cellar.data?.name ?? '…'}</h1>
            {cellar.data?.location && <p className="text-sm text-muted-foreground">{cellar.data.location}</p>}
          </div>
          <div className="w-full sm:w-56">
            <SelectField
              label="Statut"
              value={status ?? ''}
              onChange={(e) => setStatus((e.target.value || null) as BottleStatus | null)}
            >
              <option value="">Tous</option>
              {BOTTLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </SelectField>
          </div>
        </header>
      )}

      {bottles.isError && <FormError message={`Impossible de charger les bouteilles : ${bottles.error.message}`} />}
      {bottles.isSuccess && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center">Aucune bouteille dans cette cave</p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((bottle) => (
          <li key={bottle.id}>
            <Link
              to={`/bottles/${bottle.id}`}
              className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted"
            >
              <span>
                <span className="font-medium">{`${bottle.rum.distillery} — ${bottle.rum.cuvee_name}`}</span>
                <span className="block text-xs text-muted-foreground">
                  {[bottle.rum.vintage, bottle.rum.abv && `${bottle.rum.abv} %`, bottle.cask_number && `Fût n°${bottle.cask_number}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                {bottle.quantity > 1 && <span className="text-muted-foreground">×{bottle.quantity}</span>}
                <StatusBadge status={bottle.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {bottles.hasNextPage && (
        <Button variant="outline" onClick={() => bottles.fetchNextPage()} disabled={bottles.isFetchingNextPage}>
          Voir plus
        </Button>
      )}
    </section>
  );
}
