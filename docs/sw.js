const CACHE = 'qr-generator-v1';
const FILES = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/qr-generator-logo.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
