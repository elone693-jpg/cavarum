import { LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/auth-api';
import { cn } from '@/lib/utils';

export function Layout() {
  const navigate = useNavigate();

  async function onSignOut() {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Déconnexion impossible');
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <NavLink to="/cellars" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="" width="32" height="32" className="h-8 w-8 rounded-lg" />
            <span className="font-serif text-xl text-primary">Cavarum</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {[
              ['/cellars', 'Mes caves'],
              ['/account', 'Mon compte'],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to!}
                className={({ isActive }) =>
                  cn('inline-flex min-h-11 items-center rounded-md px-3 text-sm', isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                {label}
              </NavLink>
            ))}
            <Button variant="ghost" onClick={onSignOut} aria-label="Déconnexion">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="mx-auto max-w-5xl space-y-1 px-4 pb-8 pt-4 text-center text-xs text-muted-foreground">
      <p>L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>
      <p className="flex justify-center gap-4">
        <NavLink to="/mentions-legales" className="inline-flex min-h-11 items-center hover:text-foreground">
          Mentions légales
        </NavLink>
        <NavLink to="/confidentialite" className="inline-flex min-h-11 items-center hover:text-foreground">
          Confidentialité
        </NavLink>
      </p>
    </footer>
  );
}

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-serif text-3xl">Page introuvable</h1>
      <p className="mt-2 text-muted-foreground">La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <NavLink to="/cellars" className="mt-6 inline-flex min-h-11 items-center text-primary">
        Retour à mes caves
      </NavLink>
    </main>
  );
}
