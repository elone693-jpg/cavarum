import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { CellarsPage } from './CellarsPage';
import * as cellarsApi from './cellars-api';

vi.mock('./cellars-api', () => ({
  listCellarSummaries: vi.fn(),
  createCellar: vi.fn(),
  deleteCellar: vi.fn(),
}));

const summaries = [
  { id: 'c-1', name: 'Cave principale', type: 'personal', location: 'Sous-sol', bottle_units: 6, purchase_total: '1234.40' },
  { id: 'c-2', name: 'Cave Paris', type: 'professional', location: null, bottle_units: 1, purchase_total: '0.00' },
] as const;

beforeEach(() => {
  vi.mocked(cellarsApi.listCellarSummaries).mockReset().mockResolvedValue([...summaries]);
  vi.mocked(cellarsApi.createCellar).mockReset().mockResolvedValue(undefined);
  vi.mocked(cellarsApi.deleteCellar).mockReset().mockResolvedValue(undefined);
});

describe('CellarsPage', () => {
  it('liste les caves avec leurs totaux', async () => {
    renderRoute(<CellarsPage />);
    const card = (await screen.findByText('Cave principale')).closest('article')!;
    expect(within(card).getByText('Sous-sol')).toBeInTheDocument();
    expect(within(card).getByText('6 bouteilles')).toBeInTheDocument();
    expect(within(card).getByText('1 234,40 €')).toBeInTheDocument();
    expect(screen.getByText('1 bouteille')).toBeInTheDocument();
  });

  it('invite à créer une première cave quand il n’y en a aucune', async () => {
    vi.mocked(cellarsApi.listCellarSummaries).mockResolvedValue([]);
    renderRoute(<CellarsPage />);
    expect(await screen.findByText('Aucune cave pour l’instant')).toBeInTheDocument();
  });

  it('crée une cave', async () => {
    const user = userEvent.setup();
    renderRoute(<CellarsPage />);
    await screen.findByText('Cave principale');
    await user.click(screen.getByRole('button', { name: 'Nouvelle cave' }));
    await user.type(screen.getByLabelText('Nom de la cave'), 'Cave Martinique');
    await user.type(screen.getByLabelText('Emplacement'), 'Fort-de-France');
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    expect(cellarsApi.createCellar).toHaveBeenCalledWith({
      name: 'Cave Martinique',
      type: 'personal',
      location: 'Fort-de-France',
    });
  });

  it('demande confirmation avant de supprimer une cave', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderRoute(<CellarsPage />);
    const card = (await screen.findByText('Cave principale')).closest('article')!;
    await user.click(within(card).getByRole('button', { name: 'Supprimer Cave principale' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('6 bouteilles'));
    expect(cellarsApi.deleteCellar).not.toHaveBeenCalled();
  });
});
