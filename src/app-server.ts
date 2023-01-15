/** @fileoverview Application server for HTML fragments routing demo. */

import { ServiceWorkerServer, Streamable, stream } from './sw-server.js';

/** Wraps the given page main content with the rest of the page (header, footer, etc.). */
async function* wrapContent(_req: Request, content: Streamable<string>):
        AsyncGenerator<string, void, void> {
    yield* stream`
<!DOCTYPE html>
<html>
    <head>
        <title>HTML Fragments Routing Demo</title>
        <meta charset="utf8">
        <script src="/router.js" type="module" async></script>
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
                    <li><a href="/streaming/">Streaming</a></li>
                    <li><a href="/streaming-list/">Streaming list</a></li>
                </ul>
            </nav>
            <main>
                <!-- \`<router-outlet />\` content is swapped out on navigation. -->
                <router-outlet>${content}</router-outlet>
            </main>
        </my-router>
    </body>
</html>
    `;
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

async function* renderStreaming(): AsyncGenerator<string, void, void> {
    yield `<h2>Hello from the streaming page.</h2>`;
    yield* streamLines(10);
}

async function* renderStreamingList(req: Request): AsyncGenerator<string, void, void> {
    // When a fragment is requested, we stream only the individual `<div>` tags.
    // When the full page is requested, we stream the full `<ul>` wrapper. This is because
    // the browse can stream that properly while HTML fragments can only stream top-level
    // nodes. Instead, the `<ul>` and `<li>` tags are created client side.
    const isFragmentReq = new URL(req.url).searchParams.has('fragment');
    if (isFragmentReq) {
        yield* streamLines(10);
    } else {
        yield '<h2>Hello from the streaming list page.</h2>';
        yield '<ul>';
        for await (const line of streamLines(10)) {
            yield `<li>${line}</li>`;
        }
        yield '</ul>';
    }
}

async function* streamLines(limit: number): AsyncGenerator<string, void, void> {
    for (let i = 0; i < limit; ++i) {
        await new Promise<void>((resolve) => {
            setTimeout(() => void resolve(), 500);
        });
        yield `<div>Hello from line #${i}.</div>`;
    }
}

/** Build the application server from all known routes. */
export const server = ServiceWorkerServer.fromRoutes<string | AsyncGenerator<string, void, void>>(
    wrapContent,
    new Map(Object.entries({
        '/': renderHome,
        '/about/': renderAbout,
        '/counter/': renderCounter,
        '/streaming/': renderStreaming,
        '/streaming-list/': renderStreamingList,
    })),
);
