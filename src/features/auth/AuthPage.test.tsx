import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { AuthPage } from './AuthPage';
import * as authApi from './auth-api';

vi.mock('./auth-api', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(authApi.signIn).mockReset().mockResolvedValue(undefined);
  vi.mocked(authApi.signUp).mockReset().mockResolvedValue(undefined);
});

async function fillSignUp(adult: boolean) {
  const user = userEvent.setup();
  renderRoute(<AuthPage />);
  await user.click(screen.getByRole('tab', { name: 'Inscription' }));
  await user.type(screen.getByLabelText('Votre nom'), 'Fred');
  await user.type(screen.getByLabelText('Email'), 'fred@example.com');
  await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
  if (adult) await user.click(screen.getByLabelText(/J’ai 18 ans ou plus/));
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
}

describe('AuthPage', () => {
  it('rappelle la mention sanitaire', () => {
    renderRoute(<AuthPage />);
    expect(screen.getByText(/L’abus d’alcool est dangereux pour la santé/)).toBeInTheDocument();
  });

  it('refuse l’inscription sans confirmation d’avoir 18 ans ou plus', async () => {
    await fillSignUp(false);
    expect(await screen.findByText('Vous devez avoir 18 ans ou plus pour utiliser Cavarum')).toBeInTheDocument();
    expect(authApi.signUp).not.toHaveBeenCalled();
  });

  it('inscrit l’utilisateur majeur et l’invite à confirmer son email', async () => {
    await fillSignUp(true);
    expect(authApi.signUp).toHaveBeenCalledWith({
      name: 'Fred',
      email: 'fred@example.com',
      password: 'motdepasse',
      adult: true,
    });
    expect(await screen.findByText(/Vérifiez votre boîte mail/)).toBeInTheDocument();
  });

  it('connecte un utilisateur existant', async () => {
    const user = userEvent.setup();
    renderRoute(<AuthPage />);
    await user.type(screen.getByLabelText('Email'), 'fred@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(authApi.signIn).toHaveBeenCalledWith('fred@example.com', 'secret');
  });

  it('affiche l’erreur renvoyée par le serveur', async () => {
    vi.mocked(authApi.signIn).mockRejectedValue(new Error('Identifiants invalides'));
    const user = userEvent.setup();
    renderRoute(<AuthPage />);
    await user.type(screen.getByLabelText('Email'), 'fred@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'faux');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides');
  });
});
