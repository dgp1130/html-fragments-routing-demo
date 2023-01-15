import { server } from './app-server.js';

self.addEventListener('install', () => {
    self.skipWaiting();
    console.log('Service worker installed!');
});

self.addEventListener('fetch', (evt: FetchEvent) => {
    evt.respondWith(server.serve(evt.request));
});
