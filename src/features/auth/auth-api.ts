import { appUrl } from '@/lib/base';
import { getSupabase } from '@/lib/supabase';
import type { SignUpInput } from './auth-schemas';

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect',
  'Email not confirmed': 'Email non confirmé : vérifiez votre boîte mail',
  'User already registered': 'Un compte existe déjà avec cet email',
};

function fail(error: { message: string } | null): void {
  if (error) throw new Error(MESSAGES[error.message] ?? error.message);
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  fail(error);
}

export async function signUp({ name, email, password }: SignUpInput) {
  const { error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      // Recopiés dans public.profiles par le trigger handle_new_user.
      data: { name, adult_confirmed_at: new Date().toISOString() },
      emailRedirectTo: appUrl(''),
    },
  });
  fail(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: appUrl('reset-password'),
  });
  fail(error);
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  fail(error);
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  fail(error);
}
