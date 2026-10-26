import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { sendPasswordReset, updatePassword } from './auth-api';
import { fieldErrors, forgotPasswordSchema, resetPasswordSchema } from './auth-schemas';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    try {
      await sendPasswordReset(parsed.data.email);
      setSent(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Envoi impossible');
    }
  }

  return (
    <AuthLayout title="Mot de passe oublié">
      {sent ? (
        <p className="text-sm">Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TextField label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
          <FormError message={formError} />
          <Button type="submit" className="w-full">
            Envoyer le lien
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    try {
      await updatePassword(parsed.data.password);
      navigate('/cellars', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Mise à jour impossible');
    }
  }

  return (
    <AuthLayout title="Nouveau mot de passe">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={errors.password} />
        <TextField label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
        <FormError message={formError} />
        <Button type="submit" className="w-full">
          Enregistrer
        </Button>
      </form>
    </AuthLayout>
  );
}
