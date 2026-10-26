import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { AccountPage } from './AccountPage';
import * as accountApi from './account-api';

vi.mock('./account-api', () => ({
  getProfile: vi.fn(),
  exportMyData: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(accountApi.getProfile).mockReset().mockResolvedValue({ name: 'Fred', email: 'fred@example.com' });
  vi.mocked(accountApi.exportMyData).mockReset().mockResolvedValue({ exported_at: '2026-10-26', cellars: [] });
  vi.mocked(accountApi.deleteMyAccount).mockReset().mockResolvedValue(undefined);
});

describe('AccountPage', () => {
  it('affiche le profil', async () => {
    renderRoute(<AccountPage />);
    expect(await screen.findByText('fred@example.com')).toBeInTheDocument();
    expect(screen.getByText('Fred')).toBeInTheDocument();
  });

  it('télécharge toutes mes données au format JSON', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:export');
    const revokeObjectURL = vi.fn();
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      const user = userEvent.setup();
      renderRoute(<AccountPage />);
      await user.click(await screen.findByRole('button', { name: 'Télécharger mes données' }));

      await vi.waitFor(() => expect(click).toHaveBeenCalled());
      expect(accountApi.exportMyData).toHaveBeenCalled();
      const blob = createObjectURL.mock.calls[0]![0];
      expect(blob.type).toBe('application/json');
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });
      expect(JSON.parse(text)).toEqual({ exported_at: '2026-10-26', cellars: [] });
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    } finally {
      Object.assign(URL, original);
      click.mockRestore();
    }
  });

  it('exige de taper SUPPRIMER avant de supprimer le compte', async () => {
    const user = userEvent.setup();
    renderRoute(<AccountPage />);
    const button = await screen.findByRole('button', { name: 'Supprimer définitivement mon compte' });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/Tapez SUPPRIMER pour confirmer/), 'supprimer');
    expect(button).toBeDisabled();
    await user.clear(screen.getByLabelText(/Tapez SUPPRIMER pour confirmer/));
    await user.type(screen.getByLabelText(/Tapez SUPPRIMER pour confirmer/), 'SUPPRIMER');
    expect(button).toBeEnabled();
  });

  it('supprime le compte puis renvoie vers la connexion', async () => {
    const user = userEvent.setup();
    renderRoute(<AccountPage />);
    await user.type(await screen.findByLabelText(/Tapez SUPPRIMER pour confirmer/), 'SUPPRIMER');
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement mon compte' }));
    expect(accountApi.deleteMyAccount).toHaveBeenCalled();
    expect(await screen.findByText('autre page')).toBeInTheDocument();
  });

  it('affiche l’erreur si la suppression échoue', async () => {
    vi.mocked(accountApi.deleteMyAccount).mockRejectedValue(new Error('Réseau indisponible'));
    const user = userEvent.setup();
    renderRoute(<AccountPage />);
    await user.type(await screen.findByLabelText(/Tapez SUPPRIMER pour confirmer/), 'SUPPRIMER');
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement mon compte' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Réseau indisponible');
  });
});
