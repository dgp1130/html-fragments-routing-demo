import { parseDomFragment } from './lib/dom.js';
import { BaseRouter, Route } from './lib/html-fragments-router.js';

/** Application router. Requests all routes with the `?fragment` query parameter. */
class Router extends BaseRouter {
    protected override async route(route: Route): Promise<DocumentFragment> {
        const url = new URL(route.toString(), location.href);

        // Tell the server to only respond with the page's contents, not the full page.
        url.searchParams.set('fragment', '');

        // Request the fragment.
        const res = await fetch(url);
        const contentType = res.headers.get('Content-Type');
        if (contentType !== 'text/html') throw new Error(`Expected \`Content-Type\` to be \`text/html\`, but got \`${contentType}\`.`);

        // Clone and use the fragment as the router contents.
        const frag = await parseDomFragment(res);
        return frag.cloneContent();
    }
}

customElements.define('my-router', Router);
