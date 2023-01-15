type Handler = (req: Request) => string | Promise<string>;
type ContentWrapper = (req: Request, content: string) => string | Promise<string>;

/** A basic server implementation using native `Request` and `Response` types. */
export class ServiceWorkerServer {
    private constructor(
        /** A function which wraps the given page content into a complete web page. */
        private readonly wrapContent: ContentWrapper,
        /** Map of routes to their handlers, returning the page main content (not the full page). */
        private readonly routes: ReadonlyMap<string, Handler>,
    ) {}

    public static fromRoutes(wrapContent: ContentWrapper, routes: ReadonlyMap<string, Handler>):
            ServiceWorkerServer {
        return new ServiceWorkerServer(wrapContent, routes);
    }

    public async serve(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const handler = this.routes.get(url.pathname);

        if (!handler) {
            console.log(`Proxying ${req.url} to the real backend.`);
            return await fetch(req);
        }
        console.log(`Handling ${req.url} in the service worker.`);

        const content = await handler(req);

        // If `?fragment` is in the URL, the router is requesting just the page's content.
        // If `?fragment` is missing, likely a real browser navigation which needs the full page.
        const requestingFragment = url.searchParams.has('fragment');
        const res = requestingFragment ? content : await this.wrapContent(req, content);

        const headers = new Headers();
        headers.set('Content-Type', 'text/html');
        return new Response(res, { headers });
    }
}
