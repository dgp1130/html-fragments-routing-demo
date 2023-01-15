/** @fileoverview Library implementation of a base router with HTML fragments. */

/** Represents a single route. */
export interface Route {
    path: string;
    params: URLSearchParams;
    hash: string;
    toString(): string;
}

/** Keeps track of the route the user is currently on. */
let currentRoute = createRoute(new URL(location.href));

/**
 * Base class for a router custom element. Override the `route()` function to return a
 * `DocumentFragment` for any given navigation.
 * 
 * ```typescript
 * class MyRouter extends BaseRouter {
 *     protected override async route(route: Route): Promise<DocumentFragment> {
 *         // Set `?pleaseGiveMeJustThePageContent`, informing the server to only return the
 *         // page's main content, and not the *entire* page (no `<html>` tag for example).
 *         const url = new URL(route.toString(), location.href);
 *         url.searchParams.set('pleaseGiveMeJustThePageContent', '');
 * 
 *         // Fetch the content and interpret it as an HTML fragment.
 *         const res = await fetch(url);
 *         const frag = await parseDomFragment(res);
 *         return frag.cloneContent();
 *     }
 * }
 * 
 * customElements.define('my-router', MyRouter);
 * ```
 * 
 * All navigations from anchor tag descendants are intercepted and transformed into
 * single-page navigations for this router. The children of this element are retained during
 * navigations, however everything under the `<router-outlet />` is swapped out on navigation.
 * So rendering looks like:
 * 
 * ```html
 * <html>
 *     <body>
 *         <my-router>
 *             <!-- Static content, remains on all navigations. -->
 *             <nav>
 *                 <ul>
 *                     <li><a href="/first/">First</a></li>
 *                     <li><a href="/second/">Second</a></li>
 *                     <li><a href="/third/">Third</a></li>
 *                 </ul>
 *             </nav>
 *             <main>
 *                 <!-- `<router-outlet />` content gets swapped out on navigation. -->
 *                 <router-outlet>
 *                     <h2>Hello from the first page!</h2>
 *                 </router-outlet>
 *             </main>
 *         </my-router>
 * 
 *         <!-- Content outside `<my-router />` remains after navigations. -->
 *         <footer>...</footer>
 *     </body>
 * </html>
 * ```
 */
export abstract class BaseRouter extends HTMLElement {
    /**
     * Cache of `<router-outlet>` nodes for previously visited routes. It might make sense to
     * leave the `<router-outlet>` alone and only cache its content, however this actually
     * doesn't work when streaming the main HTML document and navigating. In such a case, the
     * main document will continue parsing and appending to the original parent node (the
     * `<router-outlet>` in this case). So if we left the `<router-outlet>` in the DOM on
     * navigation, then use cases which stream the HTML document and navigate part way through
     * would cause subsequently streamed content to be appended to the currently displayed
     * route, and not the cached route.
     */
    private fragmentCache = new Map<string /* route */, Element /* outlet */>();

    /**
     * User-implemented function to apply application logic to routing. Asks the user to
     * define the semantics for requesting a route fragment from the server.
     */
    protected abstract route(route: Route):
        Promise<DocumentFragment | AsyncGenerator<Node, void, void>>;

    connectedCallback(): void {
        window.addEventListener('popstate', this.onRouteChange);
        this.addEventListener('click', this.onDescendantClicked);
    }

    disconnectedCallback(): void {
        this.removeEventListener('click', this.onDescendantClicked);
        window.removeEventListener('popstate', this.onRouteChange);
    }

    private onDescendantClicked = ((evt: Event) => {
        // Ignore all clicks besides `<a>` tags.
        // Use composed path to pierce shadow DOM and avoid event re-targeting.
        const target = evt.composedPath()[0];
        if (!(target instanceof Element)) return;
        if (target.tagName !== 'A') return;

        // Don't actually navigate the browser.
        evt.preventDefault();

        // Trigger SPA navigation instead.
        const href = target.getAttribute('href');
        if (!href) throw new Error(`Clicked \`<a />\` tag with no \`href\` attribute.`);
        this.navigate(createRoute(new URL(href, location.href)));
    }).bind(this);

    /**
     * Handle route change and update the DOM, usually from the user clicking the back or
     * forward buttons on the browser.
     */
    private onRouteChange = (() => {
        this.navigate(createRoute(new URL(location.href)));
    }).bind(this);

    /** Navigate to the given route. */
    private async navigate(route: Route): Promise<void> {
        // Ignore no-op navigations to the same route.
        const prevRoute = currentRoute;
        currentRoute = route;
        if (routeEquals(prevRoute, currentRoute)) return;

        // Update the page URL.
        history.replaceState(undefined, '', `${route.path}${route.hash}`);

        const oldOutlet = this.querySelector('router-outlet');
        if (!oldOutlet) throw new Error(`No \`<router-outlet />\` element to replace. Make sure to add a \`<router-outlet />\` to the light DOM for \`${this.tagName.toLowerCase()}\`.`);

        // Cache the old outlet with its content.
        this.fragmentCache.set(prevRoute.toString(), oldOutlet);

        // Check the cache for the new route and reuse the existing fragment if present.
        const cachedOutlet = this.fragmentCache.get(currentRoute.toString());
        if (cachedOutlet) {
            console.log(`Using cached route for ${route.toString()}`);
            oldOutlet.replaceWith(cachedOutlet);
            return;
        }

        // Call user-space to get a new fragment for this route.
        const nodes = normalize(await this.route(currentRoute));

        // Create a new outlet for this route.
        const newOutlet = document.createElement('router-outlet');
        oldOutlet.replaceWith(newOutlet);

        // Append to the outlet as content streams in.
        for await (const node of nodes) {
            newOutlet.append(node);
        }
    }
}

async function* normalize(input: DocumentFragment | AsyncGenerator<Node, void, void>):
        AsyncGenerator<Node, void, void> {
    if (input instanceof DocumentFragment) {
        for (const node of Array.from(input.childNodes)) yield node;
    } else {
        yield* input;
    }
}

/** Create a {@link Route} object for the given {@link URL}. */
function createRoute(url: URL): Route {
    return {
        path: url.pathname,
        params: url.searchParams,
        hash: url.hash,
        toString() {
            const params = this.params.toString();
            return `${this.path}${params === '' ? '' : `?${params}`}${this.hash}`;
        }
    };
}

/** Returns whether or not two {@link Route} objects are equivalent. */
function routeEquals(first: Route, second: Route): boolean {
    if (first.path !== second.path) return false;
    if (first.hash !== second.hash) return false;

    const zippedParams = zip(Array.from(first.params.entries()), Array.from(second.params.entries()));
    for (const [[firstName, firstValue], [secondName, secondValue]] of zippedParams) {
        if (firstName !== secondName) return false;
        if (firstValue !== secondValue) return false;
    }

    return true;
}

/** Performs a functional "zip" operation on two array, returning an array of doubles. */
function zip<T1, T2>(first: T1[], second: T2[]): Array<[T1, T2]> {
    if (first.length !== second.length) throw new Error(`Cannot \`zip()\` arrays of differing lengths (${first.length} !== ${second.length}).`);

    return first.map((f, i) => [f, second[i]!]);
}
