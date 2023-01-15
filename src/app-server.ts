/** @fileoverview Application server for HTML fragments routing demo. */

import { ServiceWorkerServer } from './sw-server.js';

/** Wraps the given page main content with the rest of the page (header, footer, etc.). */
function wrapContent(_req: Request, content: string): string {
    return `
<!DOCTYPE html>
<html>
    <head>
        <title>HTML Fragments Routing Demo</title>
        <meta charset="utf8">
        <script src="/router.js" type="module"></script>
    </head>
    <body>
        <h1>HTML Fragments Routing Demo</h1>

        <!-- Navigations under \`my-router\` are handled. -->
        <my-router>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/about/">About</a></li>
                    <li><a href="/counter/">Counter</a></li>
                </ul>
            </nav>
            <main>
                <!-- \`<slot />\` content is swapped out on navigation. -->
                <slot>${content}</slot>
            </main>
        </my-router>
    </body>
</html>
    `.trim();
}

/** Render home page content. */
function renderHome(): string {
    return `
<h2>Hello from the home page.</h2>
    `.trim();
}

/** Render about page content. */
function renderAbout(): string {
    return `
<h2>Hello from the about page.</h2>

<p>
    I'm the "Devel without a Cause", a web infrastructure engineer focused on making the web
    simpler, and more powerful.
</p>
    `.trim();
}

/** Render counter page content. */
function renderCounter(): string {
    return `
<h2>Hello from the counter page.</h2>

<my-counter>
    <template shadowroot="open">
        <div>The current count is: <span>5</span>.</div>
        <button id="decrement">-</button>
        <button id="increment">+</button>

        <style>:host { display: block; }</style>
        <script src="/counter.js" type="module"></script>
    </template>
</my-counter>
    `.trim();
}

/** Build the application server from all known routes. */
export const server = ServiceWorkerServer.fromRoutes(wrapContent, new Map(Object.entries({
    '/': renderHome,
    '/about/': renderAbout,
    '/counter/': renderCounter,
})));
