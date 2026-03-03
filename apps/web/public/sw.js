// Service worker for SavSpot browser push notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SavSpot';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data || {},
    tag: data.tag || 'savspot-notification',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const actionUrl = event.notification.data && event.notification.data.actionUrl;
  const url = actionUrl || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.focus();
          if (actionUrl) client.navigate(actionUrl);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
