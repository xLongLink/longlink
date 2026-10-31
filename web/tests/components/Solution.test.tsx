// @vitest-environment happy-dom
import { act, Suspense } from 'react';
import { createHash } from 'node:crypto';
import { createRoot } from 'react-dom/client';
import { MessagePort } from 'node:worker_threads';
import { SolutionRuntime } from '@/components/Solution';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorContext, createErrorReporter } from '@/lib/errors';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('SolutionRuntime', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let mountedClient: QueryClient | undefined;
    let mountedContainer: HTMLDivElement | undefined;

    afterEach(async () => {
        // Unmount before removing the container and restoring globals.
        const mountedRoot = root;

        if (mountedRoot) await act(async () => mountedRoot.unmount());

        root = undefined;

        // Restore transport observers after the runtime has released its capabilities.
        vi.restoreAllMocks();

        // Clear cached queries before restoring their timers and globals.
        mountedClient?.clear();
        mountedClient = undefined;
        mountedContainer?.remove();
        mountedContainer = undefined;
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it.each([
        {
            name: 'a manifest failure',
            response: () => Response.json({ detail: 'Manifest unavailable' }, { status: 503 }),
            initialPath: '/',
            title: 'Unable to load this solution',
            description: 'The solution definition could not be loaded.',
        },
        {
            name: 'an empty manifest response',
            response: () => manifestResponse([]),
            initialPath: '/',
            title: 'Unexpected solution response',
            description: 'The solution did not expose any views to render.',
        },
        {
            name: 'a view failure after loading the manifest',
            response: (url: string) => {
                if (url.endsWith('/views.json')) return manifestResponse([{ path: 'home.jsx', route: '/home' }]);

                return Response.json({ detail: 'View unavailable' }, { status: 503 });
            },
            initialPath: '/home',
            title: 'Unable to load this view',
            description: 'The view could not be loaded.',
        },
    ])('renders $name', async ({ response, initialPath, title, description }) => {
        // Arrange
        stubFetch(response);

        // Act
        const output = await renderRuntime(initialPath);

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain(title)));
        expect(output.textContent).toContain(description);
    });

    it('redirects the solution base to the first tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse([
                      { path: 'index.jsx', route: '/' },
                      { path: 'home.jsx', route: '/home' },
                  ])
                : sourceResponse('export default function Home() { return <Text>Home</Text>; }')
        );

        // Act
        const output = await renderRuntime('/');

        // Assert
        // Router navigation does not settle inside act, so observe it directly.
        await vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'));
        expect(output.querySelector('[data-path]')?.getAttribute('data-tabs')).toBe('/home');
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
    });

    it('rejects an external manifest view path before fetching the view', async () => {
        // Arrange
        const fetchRequest = vi.fn((url: string) => {
            if (url.endsWith('/views.json'))
                return manifestResponse([{ path: 'https://example.com/view.jsx', route: '/home' }]);
            throw new Error('View fetch must not occur');
        });

        stubFetch(fetchRequest);

        // Act
        const output = await renderRuntime('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this solution')));
        expect(fetchRequest).toHaveBeenCalledOnce();
    });

    it('transfers dynamic route parameters', async () => {
        // Arrange
        vi.useFakeTimers();
        stubFetch((url) => {
            if (url.endsWith('/views.json'))
                return manifestResponse([{ path: 'views/issues/[item]', route: '/issues/:issueId' }]);

            return sourceResponse(
                'export default function Issue({ params }) { return <Text>{params.issueId}</Text>; }'
            );
        });

        // Act
        const output = await renderRuntime('/issues/42');

        // Assert
        const { frame, session, transfer } = await observeView(output);

        // Authenticated window dispatch transfers the route parameters synchronously.
        window.dispatchEvent(
            new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
        );
        expect(transfer).toHaveBeenCalledOnce();
        expect(transfer.mock.calls[0]?.[0]).toHaveProperty('params', { issueId: '42' });
        expect(output.querySelector('[data-title]')?.getAttribute('data-title')).toBe('Item');

        // A successful handshake cancels the startup deadline without removing the frame.
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.querySelector('iframe')).not.toBeNull();
    });

    it.each([
        { name: 'source window', overrides: { source: window } },
        { name: 'origin', overrides: { origin: 'https://attacker.example' } },
        { name: 'session', overrides: { data: 'wrong-session' } },
    ])('rejects a handshake with the wrong $name without consuming a valid handshake', async ({ overrides }) => {
        // Arrange
        vi.useFakeTimers();
        const source = 'export default function Home() { return <Text>Home</Text>; }';
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                : sourceResponse(source)
        );
        const output = await renderRuntime('/home');
        const { frame, session, transfer } = await observeView(output);
        const handshake = { source: frame.contentWindow, origin: 'null', data: session };

        // Act
        window.dispatchEvent(new MessageEvent('message', { ...handshake, ...overrides }));

        // Assert
        // Window dispatch is synchronous, so rejection must not transfer a capability.
        expect(transfer).not.toHaveBeenCalled();

        // A correctly authenticated bootstrap must still acquire its port and cancel the deadline.
        window.dispatchEvent(new MessageEvent('message', handshake));
        expect(transfer).toHaveBeenCalledOnce();
        expect(transfer.mock.calls[0]?.[0]).toEqual({
            session,
            source,
            params: {},
            navigationBaseUrl: 'http://localhost:3000/',
            appearance: { theme: 'system', accent: 'neutral', navigation: 'sidebar' },
        });
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.querySelector('iframe')).toBe(frame);
    });

    it('rejects forbidden request options while keeping the capability channel usable', async () => {
        // Arrange
        const requests: string[] = [];
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return manifestResponse([{ path: 'home.jsx', route: '/home' }]);

            if (url.endsWith('/home.jsx')) return sourceResponse('export default function Home() { return null; }');
            requests.push(new URL(url).pathname);

            return Response.json({ value: 'accepted' });
        });
        const port = await connectView(await renderRuntime('/home'));
        const replies: unknown[] = [];
        port.on('message', replies.push.bind(replies));

        try {
            // Act
            port.postMessage({ type: 'request', id: 1, path: 'items', method: 'GET', credentials: 'include' });
            port.postMessage({ type: 'request', id: 2, path: 'items', method: 'GET' });

            // Assert
            // The valid reply is a same-port barrier after the rejected command.
            await vi.waitFor(() => expect(replies).toEqual([{ id: 2, ok: true, data: { value: 'accepted' } }]));
            expect(requests).toEqual(['/items']);
        } finally {
            port.close();
        }
    });

    it('aborts an outstanding request and delivers no reply after unmount', async () => {
        // Arrange
        let release!: (response: Response) => void;

        const response = new Promise<Response>((resolve) => {
            release = resolve;
        });

        let request: Request | undefined;
        stubFetch((url, incoming) => {
            if (url.endsWith('/views.json')) return manifestResponse([{ path: 'home.jsx', route: '/home' }]);

            if (url.endsWith('/home.jsx')) return sourceResponse('export default function Home() { return null; }');
            request = incoming;

            return response;
        });
        const port = await connectView(await renderRuntime('/home'));
        const replies: unknown[] = [];
        port.on('message', replies.push.bind(replies));
        const barrier = new MessageChannel();

        try {
            // Act
            port.postMessage({ type: 'request', id: 1, path: 'items', method: 'GET' });
            await vi.waitFor(() => expect(request).toBeDefined());
            expect(request?.signal.aborted).toBe(false);
            await act(async () => root?.unmount());
            root = undefined;

            // Assert
            // Observe cancellation before any teardown hook can abort the transport.
            expect(request?.signal.aborted).toBe(true);
            await act(async () => release(Response.json({ value: 'late' })));

            // Drain the resumed transport and queued port messages without sleeping.
            let drained = false;
            barrier.port2.onmessage = () => {
                drained = true;
            };

            barrier.port1.postMessage(null);
            await vi.waitFor(() => expect(drained).toBe(true));
            expect(replies).toEqual([]);
        } finally {
            await act(async () => release(Response.json(null)));
            port.close();
            barrier.port1.close();
            barrier.port2.close();
        }
    });

    it('keeps a custom manifest URL and fetches JSX beside it without executing it in the host', async () => {
        // Arrange
        const requests: Request[] = [];
        stubFetch((url, request) => {
            requests.push(request);

            if (url.endsWith('/proxy/views.json?version=1#manifest'))
                return manifestResponse([{ path: 'home.jsx', route: '/home' }]);

            if (url.endsWith('/proxy/home.jsx'))
                return sourceResponse('export default function Welcome() { return <Text>Welcome</Text>; }');

            throw new Error(`Unexpected request ${request.method} ${url}`);
        });

        // Act
        const output = await renderRuntime('/home', '/proxy/views.json?version=1#manifest');

        // Assert
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));

        // Identify contract requests independently of runtime asset loading order and count.
        const manifestRequest = requests.find((request) => new URL(request.url).pathname === '/proxy/views.json');
        const viewRequest = requests.find((request) => new URL(request.url).pathname === '/proxy/home.jsx');

        if (!manifestRequest || !viewRequest) throw new Error('Missing manifest or JSX request');
        const manifestUrl = new URL(manifestRequest.url);
        expect(`${manifestUrl.pathname}${manifestUrl.search}${manifestUrl.hash}`).toBe(
            '/proxy/views.json?version=1#manifest'
        );
        expect(viewRequest.headers.get('accept')).toBe('text/plain');
        expect(output.querySelector('iframe')?.getAttribute('sandbox')).toBe(
            'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'
        );
        expect(output.querySelector('iframe')?.srcdoc).toContain("form-action 'none'");
        expect(output.textContent).not.toContain('Welcome');
    });

    it('renders a startup failure when the isolated View never becomes ready', async () => {
        // Arrange
        vi.useFakeTimers();
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                : sourceResponse('export default function Home() { return <Text>Home</Text>; }')
        );

        // Wait until the isolated frame has started before advancing its readiness deadline.
        const output = await renderRuntime('/home');
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));

        // Missing bootstrap readiness fails visibly instead of leaving a blank sandbox indefinitely.
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.textContent).toContain('Unable to load this View');
        expect(output.querySelector('iframe')).toBeNull();
    });

    it('rejects unmatched routes', async () => {
        // Arrange
        const response = vi.fn((url: string) => {
            if (url.endsWith('/views.json'))
                return manifestResponse([{ path: 'issue.jsx', route: '/issues/:issueId' }]);
            throw new Error('View fetch must not occur for an unmatched route');
        });

        stubFetch(response);

        // Act
        const output = await renderRuntime('/missing');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain("We can't find that page")));
        expect(response).toHaveBeenCalledOnce();
    });

    /** Observes the ready frame's capability transfer without dispatching a handshake. */
    async function observeView(output: HTMLElement) {
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        const frame = output.querySelector('iframe');

        if (!frame?.contentWindow) throw new Error('Missing isolated frame');
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];

        if (!session) throw new Error('Missing bootstrap session');
        const transfer = vi.spyOn(frame.contentWindow, 'postMessage');

        return { frame, session, transfer };
    }

    /** Acquires the actual capability port through the authenticated bootstrap handshake. */
    async function connectView(output: HTMLElement): Promise<MessagePort> {
        const { frame, session, transfer } = await observeView(output);
        window.dispatchEvent(
            new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
        );
        // Inspect the transfer-list overload using Node's actual port, not the DOM constructor.
        const args: readonly unknown[] = transfer.mock.calls[0] ?? [];
        const ports = args[2];

        if (!Array.isArray(ports) || !(ports[0] instanceof MessagePort))
            throw new Error('Missing transferred capability port');

        expect(args[0]).toMatchObject({ appearance: { theme: 'system', accent: 'neutral' } });

        return ports[0];
    }

    /** Mounts the real runtime with isolated queries and routing. */
    async function renderRuntime(initialPath = '/', viewsUrl = '/views.json'): Promise<HTMLDivElement> {
        const container = document.createElement('div');
        mountedContainer = container;
        document.body.append(container);
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        mountedClient = client;

        await act(async () => {
            mountedRoot.render(
                <ApiErrorContext value={createErrorReporter(vi.fn())}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={[initialPath]}>
                            <Suspense fallback={null}>
                                <Routes>
                                    <Route
                                        element={
                                            <SolutionRuntime viewsUrl={viewsUrl}>
                                                {({ content, tabs, title }) => (
                                                    <>
                                                        <Location
                                                            tabs={tabs.map((tab) => tab.href).join(',')}
                                                            title={title}
                                                        />
                                                        {content}
                                                    </>
                                                )}
                                            </SolutionRuntime>
                                        }
                                        path="*"
                                    />
                                </Routes>
                            </Suspense>
                        </MemoryRouter>
                    </QueryClientProvider>
                </ApiErrorContext>
            );
        });

        return container;
    }
});

/** Exposes the memory-router location for assertions. */
function Location({ tabs, title }: { tabs: string; title?: string }) {
    const location = useLocation();

    return (
        <output
            data-path={`${location.pathname}${location.search}${location.hash}`}
            data-tabs={tabs}
            data-title={title}
        />
    );
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string, request: Request) => Response | Promise<Response>): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        // Normalize standard fetch inputs without depending on Ky's argument representation.
        const request = input instanceof Request ? input : new Request(input, init);
        const url = request.url;

        const pathname = new URL(url).pathname;

        if (pathname.endsWith('/views/runtime.js') || pathname.endsWith('/views/runtime.css'))
            return sourceResponse('');

        return response(url, request);
    });
}

/** Creates a catalog pinned to the empty runtime assets supplied by the transport fixture. */
function manifestResponse(views: readonly { path: string; route: string }[]): Response {
    return Response.json({ views, runtime: { version: createHash('sha256').update('\n').digest('hex') } });
}

/** Creates a source fetch response. */
function sourceResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
