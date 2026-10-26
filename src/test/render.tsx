import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/** Rendu d'un écran avec routeur et cache de requêtes isolés. */
export function renderRoute(element: ReactElement, { path = '/', url = '/' }: { path?: string; url?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<div>autre page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
