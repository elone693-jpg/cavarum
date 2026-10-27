import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@/test/render';
import { BottlePage } from './BottlePage';
import * as bottlesApi from './bottles-api';

vi.mock('./bottles-api', () => ({
  getBottle: vi.fn(),
  getPhotoUrls: vi.fn(),
}));

const detail: bottlesApi.BottleDetail = {
  id: 'b-1',
  cellar_id: 'c-1',
  status: 'in_cellar',
  quantity: 2,
  cask_number: '7',
  batch: 'B2',
  bottle_number: null,
  location_text: 'Étagère A',
  notes: 'Superbe nez',
  rum: {
    distillery: 'Neisson',
    cuvee_name: 'Réserve Spéciale',
    bottler: null,
    brand: null,
    country: 'Martinique',
    region: 'Le Carbet',
    vintage: 2015,
    age: null,
    abv: '42.0',
    volume_ml: 700,
  },
  cellar: { name: 'Cave principale' },
  purchases: [{ purchased_on: '2024-05-01', seller: 'Excellence Rhum', unit_price: '89.90', currency: 'EUR' }],
  photos: [{ storage_path: 'u/b-1/legacy-a.jpg' }],
  valuations: [{ value: '120.00', currency: 'EUR', kind: 'legacy', source: 'Cavarum v1 (valeur actuelle)', valued_at: '2026-10-26T12:00:00Z' }],
};

beforeEach(() => {
  vi.mocked(bottlesApi.getBottle).mockReset().mockResolvedValue(detail);
  vi.mocked(bottlesApi.getPhotoUrls).mockReset().mockResolvedValue(['https://signed/a.jpg']);
});

describe('BottlePage', () => {
  it('affiche le rhum, l’exemplaire et l’achat', async () => {
    renderRoute(<BottlePage />, { path: '/bottles/:bottleId', url: '/bottles/b-1' });
    expect(await screen.findByRole('heading', { name: 'Neisson — Réserve Spéciale' })).toBeInTheDocument();
    expect(bottlesApi.getBottle).toHaveBeenCalledWith('b-1');
    expect(screen.getByText('En cave')).toBeInTheDocument();
    expect(screen.getAllByText('Fût n°7')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Batch B2')[0]).toBeInTheDocument();
    expect(screen.getAllByText('89,90 €')[0]).toBeInTheDocument();
    expect(screen.getByText('Excellence Rhum')).toBeInTheDocument();
    expect(screen.getByText('Superbe nez')).toBeInTheDocument();
  });

  it('affiche les photos via des URLs signées', async () => {
    renderRoute(<BottlePage />, { path: '/bottles/:bottleId', url: '/bottles/b-1' });
    const img = await screen.findByRole('img', { name: /Neisson/ });
    expect(img).toHaveAttribute('src', 'https://signed/a.jpg');
    expect(bottlesApi.getPhotoUrls).toHaveBeenCalledWith(['u/b-1/legacy-a.jpg']);
  });

  it('affiche l’historique des estimations reprises de la v1', async () => {
    renderRoute(<BottlePage />, { path: '/bottles/:bottleId', url: '/bottles/b-1' });
    expect((await screen.findAllByText('120,00 €'))[0]).toBeInTheDocument();
    expect(screen.getByText('Cavarum v1 (valeur actuelle)')).toBeInTheDocument();
  });

  it('indique une bouteille introuvable', async () => {
    vi.mocked(bottlesApi.getBottle).mockResolvedValue(null);
    renderRoute(<BottlePage />, { path: '/bottles/:bottleId', url: '/bottles/inconnue' });
    expect(await screen.findByText('Bouteille introuvable')).toBeInTheDocument();
  });
});
