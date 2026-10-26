import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Wine } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormError, SelectField, TextField } from '@/components/ui/field';
import { formatMoney } from '@/lib/format';
import { plural } from '@/lib/utils';
import { createCellar, deleteCellar, listCellarSummaries, type CellarSummary, type CellarType } from './cellars-api';

export function CellarsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const cellars = useQuery({ queryKey: ['cellars'], queryFn: listCellarSummaries });

  const remove = useMutation({
    mutationFn: deleteCellar,
    onSuccess: () => {
      toast.success('Cave supprimée');
      return queryClient.invalidateQueries({ queryKey: ['cellars'] });
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

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Mes caves</h1>
          <p className="text-sm text-muted-foreground">Vos caves et ce qu’elles contiennent</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Nouvelle cave
          </Button>
        )}
      </header>

      {creating && <NewCellarForm onDone={() => setCreating(false)} />}

      {cellars.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {cellars.isError && <FormError message={`Impossible de charger les caves : ${cellars.error.message}`} />}
      {cellars.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">Aucune cave pour l’instant</p>
          <p className="text-sm text-muted-foreground">Créez votre première cave pour y ranger vos bouteilles.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cellars.data?.map((cellar) => (
          <article key={cellar.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/cellars/${cellar.id}`} className="font-serif text-xl hover:text-primary">
                {cellar.name}
              </Link>
              <Button
                variant="ghost"
                className="min-h-11 px-3"
                aria-label={`Supprimer ${cellar.name}`}
                onClick={() => confirmDelete(cellar)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {cellar.location && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden />
                <span>{cellar.location}</span>
              </p>
            )}
            <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Contenu</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <Wine className="h-4 w-4 text-primary" aria-hidden />
                  <span>{plural(cellar.bottle_units, 'bouteille')}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Coût d’achat</dt>
                <dd className="font-medium">{formatMoney(cellar.purchase_total)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewCellarForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: createCellar,
    onSuccess: () => {
      toast.success('Cave créée');
      onDone();
      return queryClient.invalidateQueries({ queryKey: ['cellars'] });
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
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
      <TextField label="Nom de la cave" name="name" placeholder="Cave principale" maxLength={200} />
      <TextField label="Emplacement" name="location" placeholder="Sous-sol, Fort-de-France…" maxLength={200} />
      <SelectField label="Type" name="type" defaultValue="personal">
        <option value="personal">Personnelle</option>
        <option value="professional">Professionnelle</option>
      </SelectField>
      <div className="sm:col-span-3">
        <FormError message={error} />
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" disabled={create.isPending}>
          Créer
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
