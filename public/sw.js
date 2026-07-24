const CACHE_VERSION = 'tokyo-admin-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/admin-icon-192.png',
  '/icons/admin-icon-512.png',
  '/icons/admin-apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('tokyo-admin-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json?.() || {};
  } catch {
    payload = {};
  }

  const data = payload.data || {};
  const title = data.title || payload.notification?.title || '藏前管理';
  const body = data.body || payload.notification?.body || '有新的管理通知';
  const targetUrl = safeNotificationUrl(data.url);

  const tasks = [
    self.registration.showNotification(title, {
      body,
      icon: '/icons/admin-icon-192.png',
      badge: '/icons/admin-icon-192.png',
      tag: data.tag || 'tokyo-admin-notification',
      renotify: true,
      data: { url: targetUrl },
    }),
  ];

  if (data.badge && self.navigator?.setAppBadge) {
    tasks.push(self.navigator.setAppBadge(Number(data.badge) || 1));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = safeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ('navigate' in client) await client.navigate(targetUrl);
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/__/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

function safeNotificationUrl(value) {
  try {
    const url = new URL(value || '/admin/messages', self.location.origin);
    if (url.origin !== self.location.origin) return '/admin/messages';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin/messages';
  }
}
