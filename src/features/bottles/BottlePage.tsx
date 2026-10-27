import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BottleGlyph } from '@/components/BottleGlyph';
import { EmptyState, ErrorState, Section, Skeleton, Stat, StatGrid } from '@/components/ui/layout';
import { formatDate, formatMoney } from '@/lib/format';
import { getBottle, getPhotoUrls } from './bottles-api';
import { StatusBadge } from './StatusBadge';

function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="numeric text-[15px]">{value}</dd>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="numeric inline-flex items-center rounded-full border border-border-strong bg-surface-raised/70 px-2.5 py-0.5 text-xs text-foreground/90">
      {children}
    </span>
  );
}

export function BottlePage() {
  const { bottleId = '' } = useParams();
  const bottle = useQuery({ queryKey: ['bottle', bottleId], queryFn: () => getBottle(bottleId) });
  const paths = bottle.data?.photos.map((p) => p.storage_path) ?? [];
  const photos = useQuery({
    queryKey: ['bottle-photos', paths],
    queryFn: () => getPhotoUrls(paths),
    enabled: paths.length > 0,
  });

  if (bottle.isPending) {
    return (
      <div className="grid gap-6 md:grid-cols-[280px_1fr]" aria-busy="true" aria-label="Chargement de la bouteille">
        <Skeleton className="aspect-[3/4] w-full rounded-[var(--radius)]" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  if (bottle.isError) {
    return <ErrorState title="Impossible de charger la bouteille" error={bottle.error} onRetry={() => bottle.refetch()} />;
  }
  if (!bottle.data) {
    return (
      <EmptyState icon={Wine} title="Bouteille introuvable">
        Cette bouteille n’existe pas ou ne vous appartient pas.
      </EmptyState>
    );
  }

  const b = bottle.data;
  const title = `${b.rum.distillery} — ${b.rum.cuvee_name}`;
  const purchase = b.purchases[0];
  const latest = b.valuations[0];

  return (
    <article className="space-y-8">
      <Link
        to={`/cellars/${b.cellar_id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {b.cellar.name}
      </Link>

      <div className="grid gap-6 md:grid-cols-[280px_1fr] md:gap-10">
        <div className="surface relative mx-auto flex aspect-[4/3] w-full max-w-sm items-center justify-center overflow-hidden md:aspect-[3/4] md:max-w-none">
          {photos.data && photos.data.length > 0 ? (
            <img src={photos.data[0]} alt={`${title} — photo 1`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_60%,hsl(var(--primary)/0.12),transparent_65%)]">
              <BottleGlyph className="h-28 md:h-48" />
              <span className="text-xs text-muted-foreground">Aucune photo</span>
            </div>
          )}
          {photos.data && photos.data.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-xs">+{photos.data.length - 1}</span>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-[2.25rem] leading-[1.1] sm:text-5xl">
              <span className="eyebrow mb-2 block font-sans">{b.rum.distillery}</span>
              <span className="sr-only"> — </span>
              {b.rum.cuvee_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={b.status} />
              {b.rum.vintage && <Chip>Millésime {b.rum.vintage}</Chip>}
              {b.rum.age !== null && <Chip>{b.rum.age} ans</Chip>}
              {b.rum.abv && <Chip>{b.rum.abv} %</Chip>}
              <Chip>{b.rum.volume_ml / 10} cl</Chip>
              {b.cask_number && <Chip>Fût n°{b.cask_number}</Chip>}
              {b.batch && <Chip>Batch {b.batch}</Chip>}
              {b.bottle_number && <Chip>Bouteille n°{b.bottle_number}</Chip>}
            </div>
          </header>

          <StatGrid>
            <Stat label="Prix d’achat" value={formatMoney(purchase?.unit_price ?? null, purchase?.currency)} />
            <Stat label="Dernière estimation" value={formatMoney(latest?.value ?? null, latest?.currency)} />
            <Stat label="Quantité" value={b.quantity} wide />
          </StatGrid>

          {b.notes && (
            <blockquote className="border-l-2 border-primary/60 pl-4 font-serif text-lg italic leading-relaxed text-foreground/90">
              {b.notes}
            </blockquote>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Le rhum">
          <dl className="grid grid-cols-2 gap-4">
            <Fact label="Distillerie" value={b.rum.distillery} />
            <Fact label="Origine" value={[b.rum.country, b.rum.region].filter(Boolean).join(' · ')} />
            <Fact label="Embouteilleur" value={b.rum.bottler ?? b.rum.brand} />
            <Fact label="Millésime" value={b.rum.vintage} />
            <Fact label="Âge" value={b.rum.age !== null ? `${b.rum.age} ans` : null} />
            <Fact label="Degré" value={b.rum.abv && `${b.rum.abv} %`} />
          </dl>
        </Section>

        <Section title="Mon exemplaire">
          <dl className="grid grid-cols-2 gap-4">
            <Fact label="Cave" value={b.cellar.name} />
            <Fact label="Emplacement" value={b.location_text} />
            <Fact label="N° de fût" value={b.cask_number && `Fût n°${b.cask_number}`} />
            <Fact label="Batch" value={b.batch && `Batch ${b.batch}`} />
          </dl>
        </Section>

        <Section title="Achat">
          {!purchase ? (
            <p className="text-sm text-muted-foreground">Aucun achat enregistré</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Prix unitaire" value={formatMoney(purchase.unit_price, purchase.currency)} />
              <Fact label="Date" value={formatDate(purchase.purchased_on)} />
              <Fact label="Vendeur" value={purchase.seller} />
            </dl>
          )}
        </Section>

        <Section title="Historique des estimations">
          {b.valuations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune estimation</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border-strong pl-5">
              {b.valuations.map((v, i) => (
                <li key={i} className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${i === 0 ? 'bg-primary' : 'bg-border-strong'}`}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="numeric font-serif text-xl font-semibold">{formatMoney(v.value, v.currency)}</span>
                    <span className="numeric text-xs text-muted-foreground">{formatDate(v.valued_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{v.source}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </article>
  );
}
