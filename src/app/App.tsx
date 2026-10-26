import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, RequireAuth } from '@/features/auth/AuthProvider';
import { Layout, NotFoundPage } from './Layout';

// Chaque écran est chargé à la demande : le premier affichage ne télécharge que le nécessaire.
const AuthPage = lazy(() => import('@/features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage })),
);
const CellarsPage = lazy(() => import('@/features/cellars/CellarsPage').then((m) => ({ default: m.CellarsPage })));
const CellarPage = lazy(() => import('@/features/bottles/CellarPage').then((m) => ({ default: m.CellarPage })));
const BottlePage = lazy(() => import('@/features/bottles/BottlePage').then((m) => ({ default: m.BottlePage })));
const AccountPage = lazy(() => import('@/features/account/AccountPage').then((m) => ({ default: m.AccountPage })));
const LegalNoticePage = lazy(() => import('@/features/legal/LegalPages').then((m) => ({ default: m.LegalNoticePage })));
const PrivacyPage = lazy(() => import('@/features/legal/LegalPages').then((m) => ({ default: m.PrivacyPage })));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

function PageLoader() {
  return (
    <p role="status" className="p-6 text-muted-foreground">
      Chargement…
    </p>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/mentions-legales" element={<LegalNoticePage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/cellars" replace />} />
                <Route path="/cellars" element={<CellarsPage />} />
                <Route path="/cellars/:cellarId" element={<CellarPage />} />
                <Route path="/bottles/:bottleId" element={<BottlePage />} />
                <Route path="/account" element={<AccountPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
