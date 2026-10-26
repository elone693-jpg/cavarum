import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import * as authApi from './auth-api';
import { ForgotPasswordPage, ResetPasswordPage } from './PasswordPages';

vi.mock('./auth-api', () => ({
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(authApi.sendPasswordReset).mockReset().mockResolvedValue(undefined);
  vi.mocked(authApi.updatePassword).mockReset().mockResolvedValue(undefined);
});

describe('ForgotPasswordPage', () => {
  it('envoie le lien et confirme sans révéler si le compte existe', async () => {
    const user = userEvent.setup();
    renderRoute(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText('Email'), 'fred@example.com');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
    expect(authApi.sendPasswordReset).toHaveBeenCalledWith('fred@example.com');
    expect(await screen.findByText(/Si un compte existe pour cet email/)).toBeInTheDocument();
  });

  it('refuse un email invalide', async () => {
    const user = userEvent.setup();
    renderRoute(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText('Email'), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
    expect(authApi.sendPasswordReset).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordPage', () => {
  it('refuse deux mots de passe différents', async () => {
    const user = userEvent.setup();
    renderRoute(<ResetPasswordPage />);
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'rhum-agricole-1');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'rhum-agricole-2');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    expect(authApi.updatePassword).not.toHaveBeenCalled();
  });

  it('enregistre le nouveau mot de passe puis renvoie vers les caves', async () => {
    const user = userEvent.setup();
    renderRoute(<ResetPasswordPage />);
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'rhum-agricole-1');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'rhum-agricole-1');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(authApi.updatePassword).toHaveBeenCalledWith('rhum-agricole-1');
    expect(await screen.findByText('autre page')).toBeInTheDocument();
  });

  it('affiche l’erreur du serveur', async () => {
    vi.mocked(authApi.updatePassword).mockRejectedValue(new Error('Lien expiré'));
    const user = userEvent.setup();
    renderRoute(<ResetPasswordPage />);
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'rhum-agricole-1');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'rhum-agricole-1');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lien expiré');
  });
});
