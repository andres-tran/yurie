// Service Worker for Yurie PWA
const CACHE_NAME = 'yurie-v1.0.0';
const STATIC_CACHE_NAME = 'yurie-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'yurie-dynamic-v1.0.0';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/manifest.json',
  // External dependencies
  'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/atom-one-dark.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static files');
        return cache.addAll(STATIC_FILES.map(url => {
          // For external URLs, create Request objects with no-cors mode
          if (url.startsWith('http')) {
            return new Request(url, { mode: 'no-cors' });
          }
          return url;
        }));
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache static files:', error);
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('yurie-') && name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
          .map(name => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip caching for API endpoints
  if (url.pathname.startsWith('/chat') || 
      url.pathname.startsWith('/models') || 
      url.pathname.startsWith('/clear-history') ||
      url.pathname.startsWith('/start-session')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline response for API calls
        return new Response(JSON.stringify({
          error: 'You appear to be offline. Please check your connection.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // For navigation requests (HTML pages), try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache for offline
          return caches.match(request).then(response => {
            return response || caches.match('/');
          });
        })
    );
    return;
  }
  
  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetchAndCache(request);
        return cachedResponse;
      }
      
      // Not in cache, fetch from network
      return fetchAndCache(request);
    })
  );
});

// Helper function to fetch and cache
function fetchAndCache(request) {
  return fetch(request).then(response => {
    // Check if response is valid
    if (!response || response.status !== 200 || response.type === 'opaque') {
      return response;
    }
    
    // Clone the response
    const responseToCache = response.clone();
    
    // Cache the response
    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
      cache.put(request, responseToCache);
    });
    
    return response;
  }).catch(() => {
    // Return offline fallback for images
    if (request.destination === 'image') {
      return new Response('<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>', {
        headers: { 'Content-Type': 'image/svg+xml' }
      });
    }
    
    // Return basic offline message for other content
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  });
}

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Skip waiting message received');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Clearing caches...');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('yurie-'))
            .map(name => caches.delete(name))
        );
      })
    );
  }
});

// Background sync for offline messages (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'send-messages') {
    console.log('[ServiceWorker] Syncing offline messages...');
    // Implement offline message sync here if needed
  }
});

// Push notifications (if needed in future)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/static/icons/icon-192.png',
      badge: '/static/icons/icon-96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Yurie', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});