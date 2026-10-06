// @vitest-environment happy-dom
import { act } from 'react';
import { webcrypto } from 'node:crypto';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { ApiBoundary } from '@/components/ApiBoundary';
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

    it('renders a manifest failure', async () => {
        // Arrange
        stubFetch(() => new Response(JSON.stringify({ detail: 'Manifest unavailable' }), { status: 503 }));

        // Act
        const output = await renderRuntime();

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this solution')));
        expect(output.textContent).toContain('The solution definition could not be loaded.');
    });

    it('redirects the solution base to the first tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? Response.json([view('index.jsx', '/'), view('home.jsx', '/home')])
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

    it('renders an empty manifest response', async () => {
        // Arrange
        stubFetch(() => Response.json([]));

        // Act
        const output = await renderRuntime();

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unexpected solution response')));
        expect(output.textContent).toContain('The solution did not expose any views to render.');
    });

    it('renders a view failure after loading the manifest', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return Response.json([view('home.jsx', '/home')]);
            return new Response(JSON.stringify({ detail: 'View unavailable' }), { status: 503 });
        });

        // Act
        const output = await renderRuntime('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this view')));
        expect(output.textContent).toContain('The view could not be loaded.');
    });

    it('rejects an external manifest view path before fetching the view', async () => {
        // Arrange
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            const url = input instanceof Request ? input.url : String(input);

            if (url.endsWith('/views.json')) return Response.json([view('https://example.com/view.jsx', '/home')]);
            throw new Error('View fetch must not occur');
        });
        vi.stubGlobal('fetch', fetchRequest);

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
            if (url.endsWith('/views.json')) return Response.json([view('views/issues/[item]', '/issues/:issueId')]);
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
        const initialization = vi.fn<(event: MessageEvent<unknown>) => void>();
        frame.contentWindow.addEventListener('message', initialization, { once: true });
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];

        try {
            // Observe the handshake with a bounded wait rather than an unresolved promise.
            window.dispatchEvent(
                new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
            );
            await vi.waitFor(() => expect(initialization).toHaveBeenCalledOnce());
            expect(initialization.mock.calls[0]?.[0].data).toHaveProperty('params', { issueId: '42' });
            expect(output.querySelector('[data-title]')?.getAttribute('data-title')).toBe('Item');

            // A successful handshake cancels the startup deadline without removing the frame.
            await act(async () => vi.advanceTimersByTimeAsync(10_000));
            expect(output.querySelector('iframe')).not.toBeNull();
        } finally {
            // Release the observer even when initialization never arrives or an assertion fails.
            frame.contentWindow.removeEventListener('message', initialization);
        }
    });

    it('keeps a custom manifest URL and fetches JSX beside it without executing it in the host', async () => {
        // Arrange
        const requests: Request[] = [];
        stubFetch((url, request) => {
            requests.push(request);
            if (url.endsWith('/proxy/views.json?version=1#manifest')) return Response.json([view('home.jsx', '/home')]);
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
        expect(output.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts');
        expect(output.textContent).not.toContain('Welcome');
    });

    it('renders a startup failure when the isolated View never becomes ready', async () => {
        // Arrange
        vi.useFakeTimers();
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? Response.json([view('home.jsx', '/home')])
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
            if (url.endsWith('/views.json')) return Response.json([view('issue.jsx', '/issues/:issueId')]);
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
        vi.stubGlobal('crypto', webcrypto);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        mountedClient = client;

        await act(async () => {
            mountedRoot.render(
                <ApiErrorContext value={() => {}}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={[initialPath]}>
                            <ApiBoundary>
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
                            </ApiBoundary>
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

/** Creates a minimal manifest view. */
function view(path: string, route: string) {
    return { path, route };
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string, request: Request) => Response): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        if (!(input instanceof Request)) throw new Error('Expected a Request at the HTTP boundary');
        const url = input.url;
        if (url.endsWith('/views/runtime.js') || url.endsWith('/views/runtime.css')) return sourceResponse('');

        return response(url, input);
    });
}

/** Creates a source fetch response. */
function sourceResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
