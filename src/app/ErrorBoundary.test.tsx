import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('panne inattendue');
}

afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('affiche un écran de secours au lieu d’une page blanche', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger l’application' })).toBeInTheDocument();
  });

  it('ne montre pas le détail technique à l’utilisateur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.queryByText(/panne inattendue/)).not.toBeInTheDocument();
  });

  it('recharge la page à la demande', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Recharger l’application' }));
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('laisse passer le contenu quand tout va bien', () => {
    render(
      <ErrorBoundary>
        <p>contenu</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenu')).toBeInTheDocument();
  });
});
