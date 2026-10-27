import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { CellarPage } from './CellarPage';
import * as bottlesApi from './bottles-api';

vi.mock('./bottles-api', () => ({
  getCellar: vi.fn(),
  listCellarBottles: vi.fn(),
}));

const row = (id: string, distillery: string, status: bottlesApi.BottleListItem['status']): bottlesApi.BottleListItem => ({
  id,
  status,
  quantity: 1,
  cask_number: null,
  rum: { distillery, cuvee_name: 'Cuvée', vintage: null, abv: '45.0' },
});

beforeEach(() => {
  vi.mocked(bottlesApi.getCellar).mockReset().mockResolvedValue({ id: 'c-1', name: 'Cave principale', location: 'Sous-sol' });
  vi.mocked(bottlesApi.listCellarBottles)
    .mockReset()
    .mockResolvedValue({ items: [row('b-1', 'Neisson', 'in_cellar'), row('b-2', 'Bielle', 'open')], hasMore: false });
});

describe('CellarPage', () => {
  it('liste les bouteilles de la cave avec leur statut', async () => {
    renderRoute(<CellarPage />, { path: '/cellars/:cellarId', url: '/cellars/c-1' });
    expect(await screen.findByRole('heading', { name: 'Cave principale' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Neisson — Cuvée/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('Ouverte')).toBeInTheDocument();
    expect(bottlesApi.listCellarBottles).toHaveBeenCalledWith('c-1', { status: null, page: 0 });
  });

  it('filtre par statut', async () => {
    const user = userEvent.setup();
    renderRoute(<CellarPage />, { path: '/cellars/:cellarId', url: '/cellars/c-1' });
    await screen.findByRole('link', { name: /Neisson — Cuvée/ });
    await user.selectOptions(screen.getByLabelText('Statut'), 'open');
    expect(bottlesApi.listCellarBottles).toHaveBeenLastCalledWith('c-1', { status: 'open', page: 0 });
  });

  it('charge la page suivante à la demande', async () => {
    vi.mocked(bottlesApi.listCellarBottles)
      .mockResolvedValueOnce({ items: [row('b-1', 'Neisson', 'in_cellar')], hasMore: true })
      .mockResolvedValueOnce({ items: [row('b-3', 'Damoiseau', 'in_cellar')], hasMore: false });
    const user = userEvent.setup();
    renderRoute(<CellarPage />, { path: '/cellars/:cellarId', url: '/cellars/c-1' });
    await user.click(await screen.findByRole('button', { name: 'Voir plus' }));
    expect(await screen.findByRole('link', { name: /Damoiseau — Cuvée/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Neisson — Cuvée/ })).toBeInTheDocument();
    expect(bottlesApi.listCellarBottles).toHaveBeenLastCalledWith('c-1', { status: null, page: 1 });
  });

  it('indique une cave vide', async () => {
    vi.mocked(bottlesApi.listCellarBottles).mockResolvedValue({ items: [], hasMore: false });
    renderRoute(<CellarPage />, { path: '/cellars/:cellarId', url: '/cellars/c-1' });
    expect(await screen.findByText('Aucune bouteille dans cette cave')).toBeInTheDocument();
  });
});
