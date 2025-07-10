// Service Worker for MCP Presentation
const CACHE_NAME = 'mcp-presentation-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/css/custom.css',
    '/assets/js/custom.js',
    'https://unpkg.com/reveal.js/dist/reveal.css',
    'https://unpkg.com/reveal.js/dist/theme/white.css',
    'https://unpkg.com/reveal.js/plugin/highlight/monokai.css',
    'https://unpkg.com/reveal.js/dist/reveal.js',
    'https://unpkg.com/reveal.js/plugin/notes/notes.js',
    'https://unpkg.com/reveal.js/plugin/markdown/markdown.js',
    'https://unpkg.com/reveal.js/plugin/highlight/highlight.js',
    'https://unpkg.com/mermaid/dist/mermaid.min.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});