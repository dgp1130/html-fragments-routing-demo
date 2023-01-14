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
        if (!handler) return await fetch(req);

        const content = await handler(req);
        const res = await this.wrapContent(req, content);

        const headers = new Headers();
        headers.set('Content-Type', 'text/html');
        return new Response(res, { headers });
    }
}
