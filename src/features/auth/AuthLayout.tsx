import type { ReactNode } from 'react';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <img src="/app-icon.png" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
          <h1 className="font-serif text-3xl text-primary">Cavarum</h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-lg">{children}</div>
        <p className="text-center text-xs text-muted-foreground">
          L’abus d’alcool est dangereux pour la santé, à consommer avec modération.
        </p>
      </div>
    </main>
  );
}
