import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthPage } from '@/features/auth/AuthPage';
import { AuthProvider, RequireAuth } from '@/features/auth/AuthProvider';
import { ForgotPasswordPage, ResetPasswordPage } from '@/features/auth/PasswordPages';
import { BottlePage } from '@/features/bottles/BottlePage';
import { CellarPage } from '@/features/bottles/CellarPage';
import { CellarsPage } from '@/features/cellars/CellarsPage';
import { Layout, NotFoundPage } from './Layout';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
