// Service worker minimal : rend l'app installable.
// Aucun cache hors-ligne pour l'instant (prévu au jalon 5) : toutes les requêtes passent au réseau.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
