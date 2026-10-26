import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { deleteMyAccount, exportMyData, getProfile } from './account-api';

const CONFIRMATION = 'SUPPRIMER';

function download(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cavarum-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AccountPage() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const exportData = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      download(data);
      toast.success('Export téléchargé');
    },
    onError: (error) => toast.error(`Export impossible : ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => navigate('/auth', { replace: true }),
  });

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl">Mon compte</h1>

      <div className="rounded-xl border border-border bg-card p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nom</dt>
            <dd>{profile.data?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd>{profile.data?.email ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Mes données</h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez l’ensemble de vos caves, bouteilles, achats et estimations dans un fichier JSON réutilisable.
        </p>
        <Button variant="outline" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          <Download className="h-4 w-4" aria-hidden /> Télécharger mes données
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-destructive/40 bg-card p-5">
        <h2 className="font-serif text-xl">Supprimer mon compte</h2>
        <p className="text-sm text-muted-foreground">
          Votre compte, vos caves, bouteilles, achats, estimations, photos et factures seront supprimés immédiatement et
          définitivement. Pensez à télécharger vos données avant.
        </p>
        <TextField
          label={`Tapez ${CONFIRMATION} pour confirmer`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
        />
        <FormError message={remove.error?.message ?? null} />
        <Button
          variant="destructive"
          disabled={confirmation !== CONFIRMATION || remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Supprimer définitivement mon compte
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        En savoir plus : <Link to="/confidentialite" className="text-primary underline-offset-4 hover:underline">politique de confidentialité</Link>
      </p>
    </section>
  );
}
