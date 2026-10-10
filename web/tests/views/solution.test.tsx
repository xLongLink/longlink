// @vitest-environment happy-dom
import { act, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { SolutionRuntime } from '@/components/Solution';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
            response: () => Response.json([]),
            initialPath: '/',
            title: 'Unexpected solution response',
            description: 'The solution did not expose any views to render.',
        },
        {
            name: 'a view failure after loading the manifest',
            response: (url: string) => {
                if (url.endsWith('/views.json')) return Response.json([{ path: 'home.jsx', route: '/home' }]);

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
                ? Response.json([
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
                return Response.json([{ path: 'https://example.com/view.jsx', route: '/home' }]);
            throw new Error('View fetch must not occur');
        });

        stubFetch(fetchRequest);

        // Act
        const output = await renderRuntime('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this solution')));
        expect(fetchRequest).toHaveBeenCalledOnce();
    });

    it('renders dynamic route parameters', async () => {
        // Arrange
        vi.useFakeTimers();
        stubFetch((url) => {
            if (url.endsWith('/views.json'))
                return Response.json([{ path: 'views/issues/[item]', route: '/issues/:issueId' }]);

            return sourceResponse(
                'export default function Issue({ params }) { return <Text>{params.issueId}</Text>; }'
            );
        });

        // Act
        const output = await renderRuntime('/issues/42');

        // Assert
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
        const frame = output.querySelector('iframe');

        if (!frame?.contentWindow) throw new Error('Missing isolated frame');
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];

        // Observe the real initialization transfer without owning another message listener.
        const transfer = vi.spyOn(frame.contentWindow, 'postMessage');

        try {
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
        } finally {
            // Restore the transport observer even if an initialization assertion fails.
            transfer.mockRestore();
        }
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
            url.endsWith('/views.json') ? Response.json([{ path: 'home.jsx', route: '/home' }]) : sourceResponse(source)
        );
        const output = await renderRuntime('/home');
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        const frame = output.querySelector('iframe');

        if (!frame?.contentWindow) throw new Error('Missing isolated frame');
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];

        if (!session) throw new Error('Missing bootstrap session');

        // Observe the real capability transfer without replacing its implementation.
        const transfer = vi.spyOn(frame.contentWindow, 'postMessage');
        const handshake = { source: frame.contentWindow, origin: 'null', data: session };

        try {
            // Act
            window.dispatchEvent(new MessageEvent('message', { ...handshake, ...overrides }));

            // Assert
            // Window dispatch is synchronous, so rejection must not transfer a capability.
            expect(transfer).not.toHaveBeenCalled();

            // A correctly authenticated bootstrap must still acquire its port and cancel the deadline.
            window.dispatchEvent(new MessageEvent('message', handshake));
            expect(transfer).toHaveBeenCalledOnce();
            expect(transfer.mock.calls[0]?.[0]).toEqual({ session, source, params: {} });
            await act(async () => vi.advanceTimersByTimeAsync(10_000));
            expect(output.querySelector('iframe')).toBe(frame);
        } finally {
            // Restore the transport observer even if a security assertion fails.
            transfer.mockRestore();
        }
    });

    it('keeps a custom manifest URL and fetches JSX beside it without executing it in the host', async () => {
        // Arrange
        const requests: Request[] = [];
        stubFetch((url, request) => {
            requests.push(request);

            if (url.endsWith('/proxy/views.json?version=1#manifest'))
                return Response.json([{ path: 'home.jsx', route: '/home' }]);

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
        expect(output.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
        expect(output.querySelector('iframe')?.srcdoc).toContain("form-action 'none'");
        expect(output.textContent).not.toContain('Welcome');
    });

    it('renders a startup failure when the isolated View never becomes ready', async () => {
        // Arrange
        vi.useFakeTimers();
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? Response.json([{ path: 'home.jsx', route: '/home' }])
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
            if (url.endsWith('/views.json')) return Response.json([{ path: 'issue.jsx', route: '/issues/:issueId' }]);
            throw new Error('View fetch must not occur for an unmatched route');
        });

        stubFetch(response);

        // Act
        const output = await renderRuntime('/missing');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain("We can't find that page")));
        expect(response).toHaveBeenCalledOnce();
    });

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
function stubFetch(response: (url: string, request: Request) => Response): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        // Normalize standard fetch inputs without depending on Ky's argument representation.
        const request = input instanceof Request ? input : new Request(input, init);
        const url = request.url;

        if (url.endsWith('/views/runtime.js') || url.endsWith('/views/runtime.css')) return sourceResponse('');

        return response(url, request);
    });
}

/** Creates a source fetch response. */
function sourceResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
