import { parseDomFragment, streamDomFragment } from './lib/dom.js';
import { BaseRouter, Route } from './lib/html-fragments-router.js';

/** Application router. Requests all routes with the `?fragment` query parameter. */
class Router extends BaseRouter {
    protected override async route(route: Route):
            Promise<DocumentFragment | AsyncGenerator<Node, void, void>> {
        const url = new URL(route.toString(), location.href);

        // Tell the server to only respond with the page's contents, not the full page.
        url.searchParams.set('fragment', '');

        // Request the fragment.
        const res = await fetch(url);
        const contentType = res.headers.get('Content-Type');
        if (contentType !== 'text/html') throw new Error(`Expected \`Content-Type\` to be \`text/html\`, but got \`${contentType}\`.`);

        // Different implementation based on whether we want to stream content.
        if (route.path === '/streaming/') {
            // For streaming routes with multiple top-level parents, just return a generator.
            return (async function* () {
                for await (const frag of streamDomFragment(res)) {
                    yield frag.cloneContent();
                }
            })();
        } else if (route.path === '/streaming-list/') {
            // For streaming routes with a single top-level parent (`<ul>`), stream the
            // list content and build the parent node client-side.
            const frag = document.createDocumentFragment();
            const header = document.createElement('h2');
            header.textContent = 'Hello from the streaming list page.';
            frag.append(header);
            const list = document.createElement('ul');
            frag.append(list);

            // Wrap each top-level node in an `<li>` and append it to the list.
            (async () => {
                for await (const node of streamDomFragment(res)) {
                    const listItem = document.createElement('li');
                    listItem.append(node.cloneContent());
                    list.append(listItem);
                }
            })();

            // Return the fragment with only its initial content for now. As more streams in,
            // we'll asynchronously update the fragment via the above generator.
            return frag;
        } else {
            // For non-streaming routes, just fetch the fragment and use it.
            const frag = await parseDomFragment(res);
            return frag.cloneContent();
        }
    }
}

customElements.define('my-router', Router);
