// @vitest-environment happy-dom
import { act } from 'react';
import { webcrypto } from 'node:crypto';
import { requestUrl } from '@/views/host';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { ApiBoundary } from '@/components/ApiBoundary';
import { createQueryRuntime } from '@/lib/react-query';
import { SolutionRuntime } from '@/components/Solution';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { MAX_MESSAGE_SIZE, MAX_PENDING_REQUESTS } from '@/views/protocol';

describe('SolutionRuntime', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let mountedContainer: HTMLDivElement | undefined;
    let capability: MessagePort | undefined;

    afterEach(async () => {
        // Unmount before removing the container and restoring globals.
        const mountedRoot = root;
        if (mountedRoot) await act(async () => mountedRoot.unmount());

        root = undefined;
        capability?.close();
        capability = undefined;
        mountedContainer?.remove();
        mountedContainer = undefined;
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
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
                ? Response.json([view('index', '/'), view('home', '/home')])
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
            if (url.endsWith('/views.json')) return Response.json([view('home', '/home')]);
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

            if (url.endsWith('/views.json'))
                return Response.json([view('home', '/home', 'https://example.com/view.jsx')]);
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
            if (url.endsWith('/views.json'))
                return Response.json([view('issue', '/issues/:issueId', 'views/issues/[item]')]);
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
        const initialization = new Promise<MessageEvent>((resolve) =>
            frame.contentWindow?.addEventListener('message', resolve, { once: true })
        );
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];
        window.dispatchEvent(
            new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
        );
        await vi.advanceTimersByTimeAsync(0);
        expect((await initialization).data.params).toEqual({ issueId: '42' });
        expect(output.querySelector('[data-title]')?.getAttribute('data-title')).toBe('Item');

        // A successful handshake cancels the startup deadline without removing the frame.
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.querySelector('iframe')).not.toBeNull();
        expect(output.textContent).not.toContain('Unable to load this View');
    });

    it.each(['source', 'origin', 'session'] as const)('rejects a forged bootstrap %s', async (credential) => {
        // Arrange
        vi.useFakeTimers();
        const source = 'export default function Home() { return <Text>Home</Text>; }';
        stubFetch((url) =>
            url.endsWith('/views.json') ? Response.json([view('home', '/home')]) : sourceResponse(source)
        );
        const output = await renderRuntime('/home');
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
        const frame = output.querySelector('iframe');
        if (!frame?.contentWindow) throw new Error('Missing isolated frame');
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];
        if (!session) throw new Error('Missing bootstrap session');
        const bootstrap = { source: frame.contentWindow, origin: 'null', data: session };
        const forged = {
            source: { source: window },
            origin: { origin: 'https://attacker.example' },
            session: { data: 'wrong-session' },
        }[credential];
        const initialization = vi.fn<(event: MessageEvent<unknown>) => void>();
        frame.contentWindow.addEventListener('message', initialization);

        try {
            // Act
            window.dispatchEvent(new MessageEvent('message', { ...bootstrap, ...forged }));
            await vi.advanceTimersByTimeAsync(0);

            // Assert
            expect(initialization).not.toHaveBeenCalled();

            // A valid bootstrap still receives its capability after the forgery is ignored.
            window.dispatchEvent(new MessageEvent('message', bootstrap));
            await vi.waitFor(() => expect(initialization).toHaveBeenCalledOnce());
            expect(initialization.mock.calls[0]?.[0].data).toEqual({ session, source, params: {} });
        } finally {
            // Release the observer even if a handshake assertion fails.
            frame.contentWindow.removeEventListener('message', initialization);
        }
    });

    it('keeps a custom manifest URL and fetches JSX beside it without executing it in the host', async () => {
        // Arrange
        vi.useFakeTimers();
        const requests: Request[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            if (!(input instanceof Request)) throw new Error('Expected a Request at the HTTP boundary');
            requests.push(input);
            if (input.url.endsWith('/views/runtime.js') || input.url.endsWith('/views/runtime.css'))
                return sourceResponse('');

            if (input.url.endsWith('/proxy/views.json?version=1#manifest')) {
                return Response.json([view('home', '/home')]);
            }

            return sourceResponse('export default function Welcome() { return <Text>Welcome</Text>; }');
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
        const viewUrl = new URL(viewRequest.url);
        expect(`${manifestUrl.pathname}${manifestUrl.search}${manifestUrl.hash}`).toBe(
            '/proxy/views.json?version=1#manifest'
        );
        expect(viewUrl.pathname).toBe('/proxy/home.jsx');
        expect(viewRequest.headers.get('accept')).toBe('text/plain');
        expect(output.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts');
        expect(output.textContent).not.toContain('Welcome');

        // Missing bootstrap readiness fails visibly instead of leaving a blank sandbox indefinitely.
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.textContent).toContain('Unable to load this View');
        expect(output.querySelector('iframe')).toBeNull();
    });

    it('rejects unmatched routes', async () => {
        // Arrange
        const response = vi.fn((url: string) => {
            if (url.endsWith('/views.json')) return Response.json([view('issue', '/issues/:issueId')]);
            throw new Error('View fetch must not occur for an unmatched route');
        });
        stubFetch(response);

        // Act
        const output = await renderRuntime('/missing');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain("We can't find that page")));
        expect(response).toHaveBeenCalledOnce();
    });

    it('resolves bridge requests only inside the selected Solution proxy', () => {
        expect(requestUrl('/api/v1/solutions/selected/proxy/', '/api/items?page=1')).toBe(
            '/api/v1/solutions/selected/proxy/api/items?page=1'
        );
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/../users')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/%252e%252e/users')).toThrow();
    });

    it('rejects external destinations rather than granting browser navigation capabilities', () => {
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', 'https://example.com/next')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '//example.com/next')).toThrow();
    });

    it('aborts an active bridge request when the View unmounts', async () => {
        // Arrange
        const entered = deferred<Request>();
        const cancelled = deferred<void>();
        stubFetch((url, request) => {
            if (!url.endsWith('/work')) return runtimeResponse(url);
            if (!request) throw new Error('Missing HTTP request');
            entered.resolve(request);
            return new Promise<Response>((_resolve, reject) => {
                request.signal.addEventListener(
                    'abort',
                    () => {
                        cancelled.resolve();
                        reject(request.signal.reason);
                    },
                    { once: true }
                );
            });
        });
        const output = await renderRuntime('/home');
        const { port } = await connectView(output);

        // Act
        port.postMessage({ type: 'request', id: 1, path: '/work', method: 'GET' });
        const request = await entered.promise;
        expect(request.signal.aborted).toBe(false);
        await act(async () => root?.unmount());
        root = undefined;

        // Assert
        await cancelled.promise;
        expect(request.signal.aborted).toBe(true);
    });

    it('does not execute a duplicate pending request ID twice', async () => {
        // Arrange
        const response = deferred<Response>();
        const requests: string[] = [];
        stubFetch((url) => {
            if (!url.endsWith('/work')) return runtimeResponse(url);
            requests.push(url);
            return response.promise;
        });
        const output = await renderRuntime('/home');
        const { port, replies, frame } = await connectView(output);
        const command = { type: 'request', id: 1, path: '/work', method: 'GET' };

        // Act
        port.postMessage(command);
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        port.postMessage(command);
        port.postMessage({ type: 'resize', height: 321 });

        // Assert
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(frame.height).toBe('321');
        });
        expect(requests).toHaveLength(1);
        response.resolve(Response.json({ completed: true }));
        await vi.waitFor(() => expect(replies).toEqual([{ id: 1, ok: true, data: { completed: true } }]));
    });

    it('rejects requests beyond the pending limit and releases completed slots', async () => {
        // Arrange
        const responses = Array.from({ length: MAX_PENDING_REQUESTS }, () => deferred<Response>());
        const requests: string[] = [];
        stubFetch((url) => {
            if (!url.includes('/work/')) return runtimeResponse(url);
            requests.push(url);
            const index = Number(new URL(url).pathname.split('/').at(-1));
            return responses[index]?.promise ?? Response.json({ completed: index });
        });
        const output = await renderRuntime('/home');
        const { port, replies } = await connectView(output);

        // Act
        for (let id = 0; id < MAX_PENDING_REQUESTS; id++) {
            port.postMessage({ type: 'request', id, path: `/work/${id}`, method: 'GET' });
        }
        await vi.waitFor(() => expect(requests).toHaveLength(MAX_PENDING_REQUESTS));
        port.postMessage({ type: 'request', id: 8, path: '/work/8', method: 'GET' });

        // Assert
        await vi.waitFor(() => expect(replies).toEqual([{ id: 8, ok: false, error: 'Too many pending requests' }]));
        expect(requests).toHaveLength(MAX_PENDING_REQUESTS);
        responses[0]?.resolve(Response.json({ completed: 0 }));
        await vi.waitFor(() => expect(replies).toContainEqual({ id: 0, ok: true, data: { completed: 0 } }));
        port.postMessage({ type: 'request', id: 9, path: '/work/9', method: 'GET' });
        await vi.waitFor(() => expect(replies).toContainEqual({ id: 9, ok: true, data: { completed: 9 } }));
        expect(requests).toHaveLength(MAX_PENDING_REQUESTS + 1);

        // Settle the other accepted operations before releasing the fixture.
        responses.slice(1).forEach((response) => response.resolve(Response.json({ completed: true })));
        await vi.waitFor(() => expect(replies).toHaveLength(MAX_PENDING_REQUESTS + 2));
    });

    it('enforces the JSON payload limit before granting HTTP access', async () => {
        // Arrange
        const requests: string[] = [];
        stubFetch((url) => {
            if (!url.endsWith('/work')) return runtimeResponse(url);
            requests.push(url);
            return Response.json({ completed: true });
        });
        const output = await renderRuntime('/home');
        const { port, replies } = await connectView(output);
        // JSON string quotes count toward the payload limit.
        const json = 'x'.repeat(MAX_MESSAGE_SIZE - 2);

        // Act
        port.postMessage({ type: 'request', id: 1, path: '/work', method: 'POST', json });
        await vi.waitFor(() => expect(replies).toContainEqual({ id: 1, ok: true, data: { completed: true } }));
        port.postMessage({ type: 'request', id: 2, path: '/work', method: 'POST', json: `${json}x` });

        // Assert
        await vi.waitFor(() => expect(replies).toContainEqual({ id: 2, ok: false, error: 'Solution request failed' }));
        expect(requests).toHaveLength(1);
        port.postMessage({ type: 'request', id: 3, path: '/work', method: 'POST', json: 'small' });
        await vi.waitFor(() => expect(replies).toContainEqual({ id: 3, ok: true, data: { completed: true } }));
        expect(requests).toHaveLength(2);
    });

    it('confines channel navigation and permits valid sibling destinations', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? Response.json([view('home', '/home'), view('settings', '/settings')])
                : runtimeResponse(url)
        );
        const output = await renderRuntime('/solutions/selected/home', '/views.json', '/solutions/selected/');
        const { port, frame } = await connectView(output);

        // Act
        port.postMessage({ type: 'navigate', path: '/%2e%2e/outside' });
        port.postMessage({ type: 'resize', height: 321 });

        // Assert
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(frame.height).toBe('321');
        });
        expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/solutions/selected/home');
        port.postMessage({ type: 'navigate', path: '/settings?tab=details#section' });
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe(
                '/solutions/selected/settings?tab=details#section'
            );
        });
    });

    /** Captures only the unavailable iframe transfer boundary; both channel endpoints are native. */
    async function connectView(output: HTMLDivElement) {
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        const frame = output.querySelector('iframe');
        if (!frame?.contentWindow) throw new Error('Missing isolated frame');
        const session = frame.srcdoc.match(/__VIEW_SESSION__="([^"]+)"/)?.[1];
        if (!session) throw new Error('Missing bootstrap session');
        vi.spyOn(frame.contentWindow, 'postMessage').mockImplementation((...args: unknown[]) => {
            capability = (args[2] as MessagePort[] | undefined)?.[0];
        });
        window.dispatchEvent(
            new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
        );
        const port = capability;
        if (!port) throw new Error('Missing transferred capability');
        capability = port;
        const replies: unknown[] = [];
        port.on('message', (reply: unknown) => replies.push(reply));
        return { port, replies, frame };
    }

    /** Mounts the real Solution runtime with isolated routing and query state. */
    async function renderRuntime(
        initialPath = '/',
        viewsUrl = '/views.json',
        navigationBaseUrl = '/'
    ): Promise<HTMLDivElement> {
        const container = document.createElement('div');
        mountedContainer = container;
        document.body.append(container);
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('crypto', webcrypto);
        vi.stubGlobal('MessageChannel', MessageChannel);
        const { client, reportError } = createQueryRuntime(() => {}, false);
        client.setDefaultOptions({ queries: { retry: false } });

        await act(async () => {
            mountedRoot.render(
                <ApiErrorContext value={reportError}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={[initialPath]}>
                            <ApiBoundary>
                                <Routes>
                                    <Route
                                        element={
                                            <SolutionRuntime viewsUrl={viewsUrl} navigationBaseUrl={navigationBaseUrl}>
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
                                        path={`${navigationBaseUrl}*`}
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
function view(name: string, route: string, path = `${name}.jsx`) {
    return { path, route };
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string, request?: Request) => Response | Promise<Response>): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.endsWith('/views/runtime.js') || url.endsWith('/views/runtime.css')) return sourceResponse('');

        return response(url, input instanceof Request ? input : undefined);
    });
}

/** Serves the minimal real manifest and source for channel-boundary tests. */
function runtimeResponse(url: string): Response {
    return url.endsWith('/views.json')
        ? Response.json([view('home', '/home')])
        : sourceResponse('export default function Home() { return null; }');
}

/** Holds an external HTTP boundary until the test explicitly releases it. */
function deferred<T>() {
    let resolve: (value: T) => void = () => {
        throw new Error('Deferred promise is not initialized');
    };
    const promise = new Promise<T>((release) => {
        resolve = release;
    });
    return { promise, resolve };
}

/** Creates a source fetch response. */
function sourceResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
