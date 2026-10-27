// Aperçu de design (développement uniquement, non inclus dans le build) :
// affiche chaque écran avec des données d'exemple, sans base Supabase.
// Ouvrir /preview.html?route=/cellars (ou /cellars/c-1, /bottles/b-1, /account, /auth, ?state=empty|loading).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '../index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@/app/Layout';
import { AccountPage } from '@/features/account/AccountPage';
import { AuthPage } from '@/features/auth/AuthPage';
import type { BottleDetail, BottleListItem } from '@/features/bottles/bottles-api';
import { BottlePage } from '@/features/bottles/BottlePage';
import { CellarPage } from '@/features/bottles/CellarPage';
import type { CellarSummary } from '@/features/cellars/cellars-api';
import { CellarsPage } from '@/features/cellars/CellarsPage';
import { LegalNoticePage, PrivacyPage } from '@/features/legal/LegalPages';

const params = new URLSearchParams(window.location.search);
const route = params.get('route') ?? '/cellars';
const state = params.get('state');

const cellars: CellarSummary[] = [
  { id: 'c-1', name: 'Cave principale', type: 'personal', location: 'Fort-de-France — sous-sol', bottle_units: 48, purchase_total: '6845.30' },
  { id: 'c-2', name: 'Cave Paris', type: 'personal', location: 'Paris 11e', bottle_units: 17, purchase_total: '2390.00' },
  { id: 'c-3', name: 'Réserve dégustation', type: 'professional', location: null, bottle_units: 1, purchase_total: '89.90' },
];

const bottles: BottleListItem[] = [
  { id: 'b-1', status: 'in_cellar', quantity: 2, cask_number: '7', rum: { distillery: 'Neisson', cuvee_name: 'Réserve Spéciale', vintage: 2015, abv: '42.0' } },
  { id: 'b-2', status: 'open', quantity: 1, cask_number: null, rum: { distillery: 'Hampden Estate', cuvee_name: 'LROK — Velier 2010 Single Cask', vintage: 2010, abv: '59.8' } },
  { id: 'b-3', status: 'in_transit', quantity: 3, cask_number: null, rum: { distillery: 'Bielle', cuvee_name: 'Brut de fût 2008', vintage: 2008, abv: '58.1' } },
  { id: 'b-4', status: 'ordered', quantity: 1, cask_number: '1203', rum: { distillery: 'Habitation Saint-Étienne', cuvee_name: 'Single Cask Finish Sauternes', vintage: null, abv: '45.0' } },
  { id: 'b-5', status: 'sold', quantity: 1, cask_number: null, rum: { distillery: 'Caroni', cuvee_name: '1996 Full Proof Heavy', vintage: 1996, abv: '63.2' } },
];

const bottle: BottleDetail = {
  id: 'b-1',
  cellar_id: 'c-1',
  status: 'in_cellar',
  quantity: 2,
  cask_number: '7',
  batch: 'B2',
  bottle_number: '123/300',
  location_text: 'Étagère A, rangée 3',
  notes: 'Nez de canne fraîche et de vanille. Achetée lors du salon du rhum 2024.',
  rum: {
    distillery: 'Neisson',
    cuvee_name: 'Réserve Spéciale',
    bottler: null,
    brand: 'Neisson',
    country: 'Martinique',
    region: 'Le Carbet',
    vintage: 2015,
    age: 8,
    abv: '42.0',
    volume_ml: 700,
  },
  cellar: { name: 'Cave principale' },
  purchases: [{ purchased_on: '2024-05-01', seller: 'Excellence Rhum', unit_price: '89.90', currency: 'EUR' }],
  photos: [],
  valuations: [
    { value: '120.00', currency: 'EUR', kind: 'legacy', source: 'Cavarum v1 (valeur actuelle)', valued_at: '2026-10-26T12:00:00Z' },
    { value: '110.00', currency: 'EUR', kind: 'manual', source: 'Cavarum v1 (historique)', valued_at: '2025-06-01T00:00:00Z' },
  ],
};

const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } } });
if (state === 'error') {
  // Simule un échec réseau sur la liste des caves.
  client
    .getQueryCache()
    .build(client, { queryKey: ['cellars'] })
    .setState({ status: 'error', fetchStatus: 'idle', error: new Error('Failed to fetch (réseau indisponible)') });
} else if (state !== 'loading') {
  client.setQueryData(['cellars'], state === 'empty' ? [] : cellars);
  client.setQueryData(
    ['collection-summary'],
    state === 'empty'
      ? { cellar_count: 0, bottle_units: 0, purchase_total: '0.00' }
      : { cellar_count: 3, bottle_units: 66, purchase_total: '9325.20' },
  );
  client.setQueryData(['cellar', 'c-1'], { id: 'c-1', name: 'Cave principale', location: 'Fort-de-France — sous-sol' });
  client.setQueryData(['cellar-bottles', 'c-1', null], {
    pages: [{ items: state === 'empty' ? [] : bottles, hasMore: state !== 'empty' }],
    pageParams: [0],
  });
  client.setQueryData(['bottle', 'b-1'], bottle);
  client.setQueryData(['profile'], { name: 'Frédéric', email: 'collectionneur@example.com' });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/mentions-legales" element={<LegalNoticePage />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route element={<Layout />}>
            <Route path="/cellars" element={<CellarsPage />} />
            <Route path="/cellars/:cellarId" element={<CellarPage />} />
            <Route path="/bottles/:bottleId" element={<BottlePage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  </StrictMode>,
);
