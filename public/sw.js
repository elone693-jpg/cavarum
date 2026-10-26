// Service worker minimal : rend l'app installable.
// Pas de gestionnaire « fetch » : un gestionnaire vide ralentit chaque requête sans rien apporter.
// Le cache hors-ligne est prévu au jalon 5.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
