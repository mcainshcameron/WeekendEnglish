/**
 * WeekendEnglish.it - Service Worker
 * Provides offline capabilities with zero cookies and zero data collection
 */

// Cache name - update version when content changes
const CACHE_NAME = 'weekendenglish-cache-v1';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/sections.css',
  '/css/utilities.css',
  '/css/fonts.css',
  '/css/fontawesome.css',
  '/js/main.js',
  '/fonts/inter/Inter-Regular.woff2',
  '/fonts/inter/Inter-Medium.woff2',
  '/fonts/inter/Inter-SemiBold.woff2',
  '/fonts/inter/Inter-Bold.woff2',
  '/fonts/fontawesome/fa-solid-900.woff2',
  '/fonts/fontawesome/fa-brands-400.woff2',
  '/images/hero-interview.jpeg',
  '/images/collaboration.jpeg',
  '/images/presentation.jpeg',
  '/images/interview.jpeg',
  '/logos/weekend-english-high-resolution-logo-transparent.png',
  '/Cameron.jpeg'
];

// Install event - cache assets
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache if it's an API request or similar
                if (event.request.url.includes('/api/') || 
                    event.request.method !== 'GET') {
                  return;
                }
                
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If this cache name isn't in the whitelist, delete it
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
