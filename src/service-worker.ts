import { ServiceWorkerServer } from './sw-server.js';

function wrapContent(_req: Request, content: string): string {
    return `
<!DOCTYPE html>
<html>
    <head>
        <title>HTML Fragments Routing Demo</title>
        <meta charset="utf8">
    </head>
    <body>
        <h1>HTML Fragments Routing Demo</h1>
        <main>${content}</main>
    </body>
</html>
    `.trim();
}

function serveIndex(): string {
    return `
<h2>Hello, World 2!</h2>
    `.trim();
}

const server = ServiceWorkerServer.fromRoutes(wrapContent, new Map(Object.entries({
    '/': serveIndex,
})));

self.addEventListener('install', () => {
    self.skipWaiting();
    console.log('Service worker installed!');
});

self.addEventListener('fetch', (evt: FetchEvent) => {
    evt.respondWith(server.serve(evt.request));
});
