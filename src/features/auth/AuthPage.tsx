import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { signIn, signUp } from './auth-api';
import { fieldErrors, signInSchema, signUpSchema } from './auth-schemas';
import { AuthLayout } from './AuthLayout';

type Tab = 'signin' | 'signup';

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('signin');

  return (
    <AuthLayout title="Gérez votre collection de rhums premium">
      <div role="tablist" className="mb-5 grid grid-cols-2 rounded-md bg-muted p-1">
        {(
          [
            ['signin', 'Connexion'],
            ['signup', 'Inscription'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'min-h-10 rounded text-sm font-medium',
              tab === value ? 'bg-background text-foreground shadow' : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'signin' ? <SignInForm /> : <SignUpForm />}
    </AuthLayout>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signInSchema.safeParse(data);
    setFormError(null);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/cellars', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Connexion impossible');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
      <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" error={errors.password} />
      <FormError message={formError} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
      <p className="text-center text-sm">
        <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

function SignUpForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      adult: form.get('adult') === 'on',
    });
    setFormError(null);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await signUp(parsed.data);
      setDone(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Inscription impossible');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm">
        Vérifiez votre boîte mail : un lien de confirmation vient de vous être envoyé.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField label="Votre nom" name="name" autoComplete="name" error={errors.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Au moins 8 caractères"
        error={errors.password}
      />
      <div className="space-y-1.5">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="adult" className="mt-1 h-5 w-5 accent-primary" />
          <span>J’ai 18 ans ou plus et je confirme avoir l’âge légal pour consommer de l’alcool</span>
        </label>
        {errors.adult && <p className="text-sm text-destructive">{errors.adult}</p>}
      </div>
      <FormError message={formError} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  );
}
