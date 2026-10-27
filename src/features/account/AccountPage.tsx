import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { PageHeader, Section } from '@/components/ui/layout';
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

  const initial = (profile.data?.name ?? profile.data?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader eyebrow="Paramètres" title="Mon compte" />

      <div className="surface flex items-center gap-4 p-5">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-serif text-2xl font-semibold text-primary-strong"
        >
          {initial}
        </span>
        <dl className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Nom</dt>
            <dd className="truncate">{profile.data?.name ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="truncate">{profile.data?.email ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <Section title="Mes données">
        <p className="text-sm text-muted-foreground">
          Téléchargez l’ensemble de vos caves, bouteilles, achats et estimations dans un fichier JSON réutilisable.
        </p>
        <Button variant="outline" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          <Download className="h-4 w-4" aria-hidden /> Télécharger mes données
        </Button>
      </Section>

      <Section title="Supprimer mon compte" className="border-destructive/35">
        <p className="text-sm text-muted-foreground">
          Votre compte, vos caves, bouteilles, achats, estimations, photos et factures seront supprimés immédiatement et
          définitivement. Pensez à télécharger vos données avant.
        </p>
        <div className="max-w-sm">
          <TextField
            label={`Tapez ${CONFIRMATION} pour confirmer`}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </div>
        <FormError message={remove.error?.message ?? null} />
        <Button
          variant="destructive"
          disabled={confirmation !== CONFIRMATION || remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Supprimer définitivement mon compte
        </Button>
      </Section>

      <p className="text-sm text-muted-foreground">
        En savoir plus :{' '}
        <Link to="/confidentialite" className="text-primary underline-offset-4 hover:underline">
          politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
