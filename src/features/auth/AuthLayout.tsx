import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { withBase } from '@/lib/base';

/** Écran d'accueil : panneau de marque sur grand écran, formulaire centré sur mobile. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(700px_500px_at_30%_70%,hsl(var(--primary)/0.16),transparent_70%),linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))]"
        />
        <div className="relative flex items-center gap-3">
          <img src={withBase('icon.svg')} alt="" width="44" height="44" className="h-11 w-11" />
          <span className="font-serif text-2xl font-semibold">Cavarum</span>
        </div>
        <div className="relative max-w-md space-y-5">
          <p className="eyebrow">Maison du rhum</p>
          <p className="font-serif text-5xl font-semibold leading-[1.05]">Votre cave, à sa juste valeur.</p>
          <div aria-hidden className="label-rule h-px w-40" />
          <p className="text-muted-foreground">
            Ce que chaque bouteille vous a coûté, rendue chez vous. Ce qu’elle vaut aujourd’hui, à l’achat comme à la revente.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">Gestion de collection réservée aux personnes majeures.</p>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px] space-y-7">
          <div className="space-y-3 text-center lg:text-left">
            <img src={withBase('icon.svg')} alt="" width="64" height="64" className="mx-auto h-16 w-16 lg:hidden" />
            <h1 className="text-[2rem] leading-tight">
              <span className="lg:hidden">Cavarum</span>
              <span className="hidden lg:inline">Bienvenue</span>
            </h1>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className="surface p-5 sm:p-6">{children}</div>
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p>L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>
            <p className="flex justify-center gap-4">
              <Link to="/mentions-legales" className="inline-flex min-h-11 items-center hover:text-foreground">
                Mentions légales
              </Link>
              <Link to="/confidentialite" className="inline-flex min-h-11 items-center hover:text-foreground">
                Confidentialité
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
