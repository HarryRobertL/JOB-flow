/**
 * Service Worker for JobFlow PWA
 * 
 * Provides offline fallback and basic asset caching.
 * Conservative approach to avoid breaking compliance logging.
 */

const CACHE_NAME = 'jobflow-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache on install (static assets only)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[Service Worker] Failed to cache some assets:', error);
        // Don't fail installation if some assets fail to cache
      });
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (POST, PUT, DELETE, etc.) to avoid caching API calls
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip API endpoints - always fetch fresh for compliance logging
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response for caching
        const responseToCache = response.clone();
        
        // Only cache successful responses
        if (response.status === 200) {
          // Cache static assets (HTML, CSS, JS, images)
          if (
            request.destination === 'document' ||
            request.destination === 'script' ||
            request.destination === 'style' ||
            request.destination === 'image' ||
            request.destination === 'font'
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
        }
        
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a navigation request and we have an offline page, show it
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
          }
          
          // Otherwise return a basic offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

