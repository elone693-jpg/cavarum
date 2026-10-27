import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MapPin, Plus, Trash2, Warehouse, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormError, SelectField, TextField } from '@/components/ui/field';
import { EmptyState, ErrorState, PageHeader, Skeleton, Stat, StatGrid } from '@/components/ui/layout';
import { formatMoney } from '@/lib/format';
import { plural } from '@/lib/utils';
import {
  createCellar,
  deleteCellar,
  getCollectionSummary,
  listCellarSummaries,
  type CellarSummary,
  type CellarType,
} from './cellars-api';

const TYPE_LABEL: Record<CellarType, string> = { personal: 'Cave personnelle', professional: 'Cave professionnelle' };

export function CellarsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const cellars = useQuery({ queryKey: ['cellars'], queryFn: listCellarSummaries });
  const summary = useQuery({ queryKey: ['collection-summary'], queryFn: getCollectionSummary });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cellars'] }),
      queryClient.invalidateQueries({ queryKey: ['collection-summary'] }),
    ]);

  const remove = useMutation({
    mutationFn: deleteCellar,
    onSuccess: () => {
      toast.success('Cave supprimée');
      return refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  function confirmDelete(cellar: CellarSummary) {
    const message =
      cellar.bottle_units > 0
        ? `La cave « ${cellar.name} » contient ${plural(cellar.bottle_units, 'bouteille')}. Les supprimer avec la cave ?`
        : `Supprimer la cave « ${cellar.name} » ?`;
    if (window.confirm(message)) remove.mutate(cellar.id);
  }

  const newCellarButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" aria-hidden /> Nouvelle cave
    </Button>
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Ma collection" title="Mes caves" actions={!creating && cellars.data?.length ? newCellarButton : undefined} />

      {summary.data && summary.data.cellar_count > 0 && (
        <StatGrid>
          <Stat label="Caves" value={summary.data.cellar_count} />
          <Stat label="Bouteilles" value={summary.data.bottle_units} />
          <Stat label="Coût d’achat" value={formatMoney(summary.data.purchase_total)} wide />
        </StatGrid>
      )}

      {creating && <NewCellarForm onDone={() => setCreating(false)} onCreated={refresh} />}

      {cellars.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Chargement des caves">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface space-y-4 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      )}

      {cellars.isError && (
        <ErrorState title="Impossible de charger les caves" error={cellars.error} onRetry={() => cellars.refetch()} />
      )}

      {cellars.data?.length === 0 && !creating && (
        <EmptyState icon={Warehouse} title="Aucune cave pour l’instant" action={newCellarButton}>
          Créez votre première cave pour y ranger vos bouteilles : une pièce, un meuble ou une adresse.
        </EmptyState>
      )}

      {cellars.data && cellars.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cellars.data.map((cellar) => (
            <li key={cellar.id}>
              <article className="surface group relative flex h-full flex-col overflow-hidden transition-colors hover:border-primary/40">
                <div aria-hidden className="label-rule h-px w-full" />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="eyebrow">{TYPE_LABEL[cellar.type]}</p>
                      <h2 className="truncate text-2xl">
                        <Link to={`/cellars/${cellar.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                          {cellar.name}
                        </Link>
                      </h2>
                      {cellar.location && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{cellar.location}</span>
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative z-10 -mr-2 -mt-2 shrink-0"
                      aria-label={`Supprimer ${cellar.name}`}
                      onClick={() => confirmDelete(cellar)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Contenu</dt>
                      <dd className="numeric mt-0.5 font-medium">{plural(cellar.bottle_units, 'bouteille')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Coût d’achat</dt>
                      <dd className="numeric mt-0.5 font-medium">{formatMoney(cellar.purchase_total)}</dd>
                    </div>
                  </dl>
                </div>
                <ChevronRight
                  aria-hidden
                  className="absolute bottom-5 right-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCellarForm({ onDone, onCreated }: { onDone: () => void; onCreated: () => Promise<unknown> }) {
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: createCellar,
    onSuccess: () => {
      toast.success('Cave créée');
      onDone();
      return onCreated();
    },
    onError: (e) => setError(e.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) {
      setError('Le nom de la cave est obligatoire');
      return;
    }
    const location = String(form.get('location') ?? '').trim();
    create.mutate({ name, type: form.get('type') as CellarType, location: location || null });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="surface space-y-5 p-5 sm:p-6" aria-labelledby="nouvelle-cave">
      <div className="flex items-center justify-between">
        <h2 id="nouvelle-cave" className="text-2xl">
          Nouvelle cave
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onDone} aria-label="Fermer">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Nom de la cave" name="name" placeholder="Cave principale" maxLength={200} autoFocus />
        <TextField label="Emplacement" name="location" placeholder="Sous-sol, Fort-de-France…" maxLength={200} />
        <SelectField label="Type" name="type" defaultValue="personal">
          <option value="personal">Personnelle</option>
          <option value="professional">Professionnelle</option>
        </SelectField>
      </div>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={create.isPending}>
          Créer
        </Button>
      </div>
    </form>
  );
}
