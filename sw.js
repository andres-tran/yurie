const CACHE_NAME = 'perplexity-clone-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET' || 
        event.request.url.includes('api.perplexity.ai')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                const networked = fetch(event.request)
                    .then(response => {
                        // Cache valid responses
                        if (response.ok && !event.request.url.includes('chrome-extension')) {
                            const cacheCopy = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, cacheCopy));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Fallback for HTML requests - show offline page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                    });

                return cached || networked;
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2L4 10L16 18L28 10L16 2Z" stroke="white" fill="none" stroke-width="2"/><path d="M4 22L16 30L28 22" stroke="white" fill="none" stroke-width="2"/><path d="M4 16L16 24L28 16" stroke="white" fill="none" stroke-width="2"/></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2L4 10L16 18L28 10L16 2Z" stroke="white" fill="none" stroke-width="2"/></svg>',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Message'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Perplexity Clone', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});