import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormError } from '@/components/ui/field';
import { formatDate, formatMoney } from '@/lib/format';
import { getBottle, getPhotoUrls } from './bottles-api';
import { StatusBadge } from './StatusBadge';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-serif text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
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

  if (bottle.isPending) return <p className="text-muted-foreground">Chargement…</p>;
  if (bottle.isError) return <FormError message={`Impossible de charger la bouteille : ${bottle.error.message}`} />;
  if (!bottle.data) return <p>Bouteille introuvable</p>;

  const b = bottle.data;
  const title = `${b.rum.distillery} — ${b.rum.cuvee_name}`;

  return (
    <article className="space-y-6">
      <Link
        to={`/cellars/${b.cellar_id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {b.cellar.name}
      </Link>

      <header className="space-y-2">
        <h1 className="font-serif text-3xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status={b.status} />
          {b.quantity > 1 && <span>×{b.quantity}</span>}
          {b.cask_number && <span>Fût n°{b.cask_number}</span>}
          {b.batch && <span>Batch {b.batch}</span>}
          {b.bottle_number && <span>Bouteille n°{b.bottle_number}</span>}
        </div>
      </header>

      {photos.data && photos.data.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {photos.data.map((url, i) => (
            <img key={url} src={url} alt={`${title} — photo ${i + 1}`} className="h-64 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Le rhum">
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Pays" value={[b.rum.country, b.rum.region].filter(Boolean).join(' · ')} />
            <Fact label="Embouteilleur" value={b.rum.bottler ?? b.rum.brand} />
            <Fact label="Millésime" value={b.rum.vintage} />
            <Fact label="Âge" value={b.rum.age !== null ? `${b.rum.age} ans` : null} />
            <Fact label="Degré" value={b.rum.abv && `${b.rum.abv} %`} />
            <Fact label="Contenance" value={`${b.rum.volume_ml / 10} cl`} />
          </dl>
        </Section>

        <Section title="Mon exemplaire">
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Cave" value={b.cellar.name} />
            <Fact label="Emplacement" value={b.location_text} />
          </dl>
          {b.notes && <p className="whitespace-pre-line text-sm">{b.notes}</p>}
        </Section>

        <Section title="Achat">
          {b.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun achat enregistré</p>
          ) : (
            b.purchases.map((p, i) => (
              <dl key={i} className="grid grid-cols-2 gap-3">
                <Fact label="Prix unitaire" value={formatMoney(p.unit_price, p.currency)} />
                <Fact label="Date" value={formatDate(p.purchased_on)} />
                <Fact label="Vendeur" value={p.seller} />
              </dl>
            ))
          )}
        </Section>

        <Section title="Historique des estimations">
          {b.valuations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune estimation</p>
          ) : (
            <ul className="space-y-2">
              {b.valuations.map((v, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">{formatMoney(v.value, v.currency)}</span>
                  <span className="text-muted-foreground">{v.source}</span>
                  <span className="text-muted-foreground">{formatDate(v.valued_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </article>
  );
}
