import { describe, expect, it } from 'vitest';
import { resetPasswordSchema, signInSchema, signUpSchema } from './auth-schemas';

describe('signUpSchema', () => {
  const valid = { name: 'Fred', email: 'fred@example.com', password: 'rhum-agricole-1', adult: true };

  it('accepte une inscription complète', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('exige la confirmation d’avoir 18 ans ou plus', () => {
    const result = signUpSchema.safeParse({ ...valid, adult: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Vous devez avoir 18 ans ou plus pour utiliser Cavarum');
  });

  it('exige un email valide et un nom', () => {
    expect(signUpSchema.safeParse({ ...valid, email: 'pas-un-email' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it('exige un mot de passe d’au moins 12 caractères (recommandation CNIL)', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'motdepasse1' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Au moins 12 caractères');
    expect(signUpSchema.safeParse({ ...valid, password: 'motdepasse12' }).success).toBe(true);
  });
});

describe('signInSchema', () => {
  it('exige email et mot de passe', () => {
    expect(signInSchema.safeParse({ email: 'a@b.fr', password: 'x' }).success).toBe(true);
    expect(signInSchema.safeParse({ email: 'a@b.fr', password: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('exige deux mots de passe identiques', () => {
    expect(resetPasswordSchema.safeParse({ password: 'rhum-agricole-1', confirm: 'rhum-agricole-1' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: 'court', confirm: 'court' }).success).toBe(false);
    const result = resetPasswordSchema.safeParse({ password: 'rhum-agricole-1', confirm: 'rhum-agricole-2' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Les mots de passe ne correspondent pas');
  });
});
