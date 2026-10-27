import { LogOut, UserRound, Wine } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/auth-api';
import { withBase } from '@/lib/base';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/cellars', label: 'Mes caves', icon: Wine },
  { to: '/account', label: 'Mon compte', icon: UserRound },
] as const;

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <img src={withBase('icon.svg')} alt="" width="32" height="32" className="h-8 w-8" />
      <span className="font-serif text-[1.35rem] font-semibold tracking-tight text-foreground">Cavarum</span>
    </span>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Une fiche bouteille appartient à la section « Mes caves ».
  const isActive = (to: string, matched: boolean) => matched || (to === '/cellars' && pathname.startsWith('/bottles'));

  async function onSignOut() {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Déconnexion impossible');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/cellars" aria-label="Cavarum, accueil">
            <Brand />
          </NavLink>
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive: matched }) =>
                  cn(
                    'inline-flex min-h-10 items-center rounded-[10px] px-3.5 text-sm font-medium transition-colors',
                    isActive(to, matched) ? 'bg-primary/10 text-primary-strong' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Déconnexion" title="Déconnexion">
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          </Button>
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      <LegalFooter className="hidden md:block" />

      {/* Barre d'onglets mobile, au pouce, comme dans les applications natives. */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/90 pb-safe-b backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: matched }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive(to, matched) ? 'text-primary-strong' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-border/60', className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <p>L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>
        <p className="flex gap-4">
          <NavLink to="/mentions-legales" className="inline-flex min-h-11 items-center hover:text-foreground">
            Mentions légales
          </NavLink>
          <NavLink to="/confidentialite" className="inline-flex min-h-11 items-center hover:text-foreground">
            Confidentialité
          </NavLink>
        </p>
      </div>
    </footer>
  );
}

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="text-4xl">Page introuvable</h1>
      <p className="text-muted-foreground">La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <NavLink to="/cellars" className="mt-2 inline-flex min-h-11 items-center font-medium text-primary hover:text-primary-strong">
        Retour à mes caves
      </NavLink>
    </main>
  );
}
