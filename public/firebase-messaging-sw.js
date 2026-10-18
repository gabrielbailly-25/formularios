// Service worker de notificaciones push — Glera · Formularios.
// Recibe los push de Firebase Cloud Messaging (solo datos) y muestra la
// notificación con el título del plan y el nombre del hijo, además de poner
// la insignia (badge) con el número de respuestas en el icono de la app.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = (event.data && event.data.json() && event.data.json().data) || {};
  } catch (e) { /* mensaje sin datos */ }

  const title = data.title || 'Glera · Formularios';
  const options = {
    body: data.body || 'Nueva respuesta recibida',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil((async () => {
    if (data.badge) {
      try {
        const n = parseInt(data.badge, 10);
        if (!isNaN(n) && n > 0 && 'setAppBadge' in navigator) {
          await navigator.setAppBadge(n);
        } else if ('clearAppBadge' in navigator) {
          await navigator.clearAppBadge();
        }
      } catch (e) { /* Badging API no disponible */ }
    }
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.includes(url) && 'focus' in client) {
        await client.focus();
        return;
      }
    }
    if (clients.openWindow) {
      await clients.openWindow(url);
    }
  })());
});
