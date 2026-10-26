import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type State = { failed: boolean };

/** Dernier filet de sécurité : une erreur de rendu affiche un écran de secours, jamais une page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Point d'accroche pour un service de suivi d'erreurs (à brancher lors du déploiement).
    console.error('Erreur non gérée', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-3xl">Une erreur est survenue</h1>
        <p className="text-muted-foreground">
          L’application a rencontré un problème inattendu. Vos données ne sont pas affectées.
        </p>
        <Button onClick={() => window.location.reload()}>Recharger l’application</Button>
      </main>
    );
  }
}

export function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="font-serif text-3xl">Configuration incomplète</h1>
      <p className="text-muted-foreground">L’application ne peut pas démarrer : variables manquantes ou invalides.</p>
      <ul className="list-disc pl-5 font-mono text-sm">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </main>
  );
}
