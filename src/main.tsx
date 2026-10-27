// Polices servies par l'application (aucun appel à un CDN tiers, conformité RGPD).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ConfigErrorScreen, ErrorBoundary } from './app/ErrorBoundary';
import { withBase } from './lib/base';
import { readConfig } from './lib/config';
import './index.css';

const config = readConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{config.ok ? <App /> : <ConfigErrorScreen missing={config.missing} />}</ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(withBase('sw.js')).catch((error) => console.error('Service worker non enregistré', error));
  });
}
