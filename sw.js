// Service Worker للعمل دون اتصال
const CACHE_NAME = 'crypto-news-v1';
const urlsToCache = [
    './',
    './index.html',
    '.style.css',
    './app.js',
    './newsService.js',
    './config.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('api.rss2json.com') || 
        event.request.url.includes('api.coingecko.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .catch(error => {
                        console.log('Service Worker: Fetch failed', error);
                    });
            })
    );
});
