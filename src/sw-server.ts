export type Streamable<T> =
    | T
    | Promise<T>
    | Generator<T, void, void>
    | AsyncGenerator<T, void, void>;

type Handler<Content extends Streamable<string>> = (req: Request) => Content;
type ContentWrapper<Content extends Streamable<string>> =
    (req: Request, content: Awaited<Content>) => Streamable<string>;

/** A basic server implementation using native `Request` and `Response` types. */
export class ServiceWorkerServer<Content extends Streamable<string>> {
    private constructor(
        /** A function which wraps the given page content into a complete web page. */
        private readonly wrapContent: ContentWrapper<Content>,
        /** Map of routes to their handlers, returning the page main content (not the full page). */
        private readonly routes: ReadonlyMap<string, Handler<Content>>,
    ) { }

    public static fromRoutes<Content extends Streamable<string>>(
        wrapContent: ContentWrapper<Content>,
        routes: ReadonlyMap<string, Handler<Content>>,
    ): ServiceWorkerServer<Content> {
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

        const stream = asyncIteratorToStream(normalize(res));
        return new Response(stream, {
            headers: { 'Content-Type': 'text/html' },
        });
    }
}

function asyncIteratorToStream(asyncIterator: AsyncIterator<string>):
        ReadableStream<Uint8Array> {
    return new ReadableStream({
        async pull(controller): Promise<void> {
            const encoder = new TextEncoder();
            const { value, done } = await asyncIterator.next();

            if (done) {
                controller.close();
            } else {
                // For some reason we need to encode the data into a `Uint8Array`. Using a
                // `string` doesn't work. https://stackoverflow.com/a/62475808/3995712
                controller.enqueue(encoder.encode(value));
            }
        },
    });
}

export async function* stream(literals: TemplateStringsArray, ...expressions: Streamable<string>[]):
        AsyncGenerator<string, void, void> {
    for (const value of interleave(literals, expressions)) {
        yield* normalize(value);
    }
}

function* interleave<T>(literals: TemplateStringsArray, expressions: T[]):
        Generator<string | T, void, void> {
    for (const [ index, literal ] of literals.entries()) {
        yield literal;
        if (index < expressions.length) yield expressions[index];
    }
}

async function* normalize(content: Streamable<string>): AsyncGenerator<string, void, void> {
    if (typeof content === 'string' || content instanceof Promise) {
        // `string | Promise<string>`, can be `await`-ed in either case.
        yield await content;
        return;
    } else {
        // `Generator<string> | AsyncGenerator<string>`, can be `yield*`-ed in either case.
        yield* content;
    }
}
