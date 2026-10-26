import { z } from 'zod';

// Pas de compilation à la volée (new Function) : incompatible avec la CSP de l'application.
z.config({ jitless: true });

const email = z.string().trim().email('Email invalide');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Votre nom est requis').max(100),
  email,
  password: z.string().min(12, 'Au moins 12 caractères'),
  adult: z.literal(true, { error: 'Vous devez avoir 18 ans ou plus pour utiliser Cavarum' }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(12, 'Au moins 12 caractères'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Les mots de passe ne correspondent pas', path: ['confirm'] });

export type SignUpInput = z.infer<typeof signUpSchema>;

/** Premier message d'erreur par champ, pour l'affichage sous chaque input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] ??= issue.message;
  }
  return errors;
}
