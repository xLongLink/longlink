// @vitest-environment happy-dom
import { act } from 'react';
import { createHash } from 'node:crypto';
import { createRoot } from 'react-dom/client';
import { Dialog } from '@base-ui/react/dialog';
import { MessagePort } from 'node:worker_threads';
import { SolutionPage } from '@/views/host/solution-page';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorContext, createErrorReporter } from '@/lib/errors';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('SolutionPage', () => {
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
            name: 'an empty manifest response',
            response: () => manifestResponse([]),
            initialPath: '/',
            title: 'Unexpected solution response'
        },
        {
            name: 'a view failure after loading the manifest',
            response: (url: string) => {
                if (url.endsWith('/views.json')) return manifestResponse([{ path: 'home.jsx', route: '/home' }]);

                return Response.json({ detail: 'View unavailable' }, { status: 503 });
            },
            initialPath: '/home',
            title: 'Unable to load this view'
        }
    ])('renders an error without opening a View for $name', async ({ response, initialPath, title }) => {
        // Arrange
        stubFetch(response);

        // Act
        const output = await renderPage(initialPath);

        // Assert
        await act(async () => vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe(title)));
        expect(output.querySelector('iframe')).toBeNull();
    });

    it('replaces a pending manifest indicator with the eventual failure without exposing a frame', async () => {
        let finish: (response: Response) => void = () => undefined;

        const pending = new Promise<Response>((resolve) => {
            finish = resolve;
        });

        stubFetch(() => pending);
        const output = await renderPage('/home');
        const progress = output.querySelector('[data-slot="spinner"]');

        expect(progress).not.toBeNull();
        expect(progress?.getAttribute('aria-label')).toBe('Loading');
        expect(output.querySelector('iframe')).toBeNull();
        await act(async () => finish(Response.json({ detail: 'Unavailable' }, { status: 503 })));
        await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe('Unable to load this solution'));
        expect(output.querySelector('[data-slot="spinner"]')).toBeNull();
        expect(output.querySelector('iframe')).toBeNull();
    });

    it('redirects the solution base to the first tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse([
                      { path: 'index.jsx', route: '/' },
                      { path: 'home.jsx', route: '/home' }
                  ])
                : sourceResponse('export default function Home() { return <Text>Home</Text>; }')
        );

        // Act
        const output = await renderPage('/');

        // Assert
        // Router navigation does not settle inside act, so observe it directly.
        await vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'));
        expect(
            output.querySelector('[aria-label="Section navigation"] a[aria-current="page"]')?.getAttribute('href')
        ).toBe('/home');
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
    });

    it('honors explicit tab order and labels while resolving unlabeled tabs from View filenames', async () => {
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse(
                      [
                          { path: 'home.jsx', route: '/home' },
                          { path: 'purchase-orders.jsx', route: '/orders' },
                          { path: 'settings.jsx', route: '/settings' }
                      ],
                      [{ route: '/settings', label: 'Preferences' }, { route: '/orders' }]
                  )
                : sourceResponse('export default function Page() { return <Text>Content</Text>; }')
        );

        const output = await renderPage('/');
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/settings');
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        const links = Array.from(
            output.querySelectorAll<HTMLAnchorElement>(
                '[aria-label="Section navigation"] a:not([aria-label="LongLink home"])'
            )
        );
        expect(links.map((link) => [link.getAttribute('href'), link.textContent])).toEqual([
            ['/settings', 'Preferences'],
            ['/orders', 'Purchase Orders']
        ]);
        await act(async () => links[1].click());
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/orders');
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        expect(document.title).toBe('Purchase Orders | Solution');
    });

    it('does not infer navigation or redirect when the manifest explicitly disables tabs', async () => {
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse(
                      [
                          { path: 'index.jsx', route: '/' },
                          { path: 'home.jsx', route: '/home' }
                      ],
                      []
                  )
                : sourceResponse('export default function Page() { return <Text>Content</Text>; }')
        );

        const output = await renderPage('/');
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy');
        });
        expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/');
        expect(
            output.querySelector('[aria-label="Section navigation"] a:not([aria-label="LongLink home"])')
        ).toBeNull();
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
        const output = await renderPage('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this solution')));
        expect(fetchRequest).toHaveBeenCalledOnce();
    });

    it('transfers dynamic route parameters', async () => {
        // Arrange
        vi.useFakeTimers();
        const fetchView = vi.fn((url: string) => {
            if (url.endsWith('/views.json'))
                return manifestResponse([
                    { path: 'issues.jsx', route: '/issues' },
                    { path: 'views/issues/[item]', route: '/issues/:issueId' }
                ]);

            return sourceResponse(
                'export default function Issue({ params }) { return <Text>{params.issueId}</Text>; }'
            );
        });
        stubFetch(fetchView);

        // Act
        const output = await renderPage('/issues/42');

        // Assert
        const { frame, session, transfer } = await observeView(output);
        expect(fetchView.mock.calls.map(([url]) => decodeURI(new URL(url).pathname))).toEqual([
            '/views.json',
            '/views/issues/[item]'
        ]);

        // Authenticated window dispatch transfers the route parameters synchronously.
        window.dispatchEvent(
            new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: session })
        );
        expect(transfer).toHaveBeenCalledOnce();
        expect(transfer.mock.calls[0]?.[0]).toHaveProperty('params', { issueId: '42' });
        expect(document.title).toBe('Item | Solution');

        // A successful handshake cancels the startup deadline without removing the frame.
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(output.querySelector('iframe')).not.toBeNull();
    });

    it.each([
        { name: 'source window', overrides: { source: window } },
        { name: 'origin', overrides: { origin: 'https://attacker.example' } },
        { name: 'session', overrides: { data: 'wrong-session' } }
    ])('rejects a handshake with the wrong $name without consuming a valid handshake', async ({ overrides }) => {
        // Arrange
        vi.useFakeTimers();
        const source = 'export default function Home() { return <Text>Home</Text>; }';
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                : sourceResponse(source)
        );
        const output = await renderPage('/home');
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
            appearance: { theme: 'system' }
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
        const port = await connectView(await renderPage('/home'));
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
        const port = await connectView(await renderPage('/home'));
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
        const output = await renderPage('/home', '/proxy/views.json?version=1#manifest');

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

    it('rejects runtime assets that load successfully but do not match the manifest version', async () => {
        // Arrange
        const version = 'a'.repeat(64);
        const assets: { path: string; version: string | null; status: number }[] = [];
        stubFetch(
            (url) => {
                if (url.endsWith('/views.json'))
                    return Response.json({ views: [{ path: 'home.jsx', route: '/home' }], runtime: { version } });

                if (url.endsWith('/home.jsx'))
                    return sourceResponse('export default function Home() { return <Text>Home</Text>; }');

                throw new Error(`Unexpected request ${url}`);
            },
            (url) => {
                const response = sourceResponse('');
                const assetUrl = new URL(url);
                assets.push({
                    path: assetUrl.pathname,
                    version: assetUrl.searchParams.get('v'),
                    status: response.status
                });

                return response;
            }
        );

        // Act
        const output = await renderPage('/home');

        // Assert
        await act(async () =>
            vi.waitFor(() =>
                expect(output.textContent).toContain(
                    'The View runtime assets could not be loaded or did not match the manifest.'
                )
            )
        );
        expect(output.textContent).toContain('Unable to load this View');
        expect(assets).toHaveLength(2);
        expect(assets).toEqual(
            expect.arrayContaining([
                { path: '/views/runtime.js', version, status: 200 },
                { path: '/views/runtime.css', version, status: 200 }
            ])
        );
        expect(output.querySelector('iframe')).toBeNull();
    });

    it.each(['source', 'runtime'])(
        'overlaps source and runtime requests and waits for both when %s finishes first',
        async (first) => {
            // Arrange
            const source = pendingResponse();
            const script = pendingResponse();
            const styles = pendingResponse();
            const requests: string[] = [];
            stubFetch(
                (url) => {
                    if (url.endsWith('/views.json')) return manifestResponse([{ path: 'home.jsx', route: '/home' }]);
                    requests.push(new URL(url).pathname);

                    return source.promise;
                },
                (url) => {
                    const path = new URL(url).pathname;
                    requests.push(path);

                    return path.endsWith('.js') ? script.promise : styles.promise;
                }
            );

            // Act
            const output = await renderPage('/home');

            // Assert
            await vi.waitFor(() =>
                expect(requests).toEqual(
                    expect.arrayContaining(['/home.jsx', '/views/runtime.js', '/views/runtime.css'])
                )
            );
            expect(output.querySelector('iframe')).toBeNull();
            await act(async () => {
                script.resolve(sourceResponse(''));
                if (first === 'source') source.resolve(sourceResponse('export default () => null;'));
                else styles.resolve(sourceResponse(''));
            });
            await vi.waitFor(() =>
                expect(
                    mountedClient?.getQueryState(
                        first === 'source'
                            ? ['api', 'solution-view', '/views.json', 'home.jsx']
                            : ['view-runtime', '/', { version: createHash('sha256').update('\n').digest('hex') }]
                    )?.status
                ).toBe('success')
            );
            expect(output.querySelector('iframe')).toBeNull();
            await act(async () => {
                if (first === 'source') styles.resolve(sourceResponse(''));
                else source.resolve(sourceResponse('export default () => null;'));
            });
            await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
        }
    );

    it('aborts source and runtime requests when the page unmounts during startup', async () => {
        // Arrange
        const response = pendingResponse();
        const requests: Request[] = [];
        const pending = (_url: string, request: Request) => {
            requests.push(request);

            return response.promise;
        };
        stubFetch(
            (url, request) =>
                url.endsWith('/views.json')
                    ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                    : pending(url, request),
            pending
        );
        const output = await renderPage('/home');
        await vi.waitFor(() => expect(requests).toHaveLength(3));
        expect(requests.every((request) => !request.signal.aborted)).toBe(true);

        // Act
        await act(async () => root?.unmount());
        root = undefined;

        // Assert
        expect(requests.every((request) => request.signal.aborted)).toBe(true);
        await act(async () => response.resolve(sourceResponse('')));
        expect(output.querySelector('iframe')).toBeNull();
    });

    it('reuses verified runtime assets across View navigation', async () => {
        // Arrange
        const runtimeResponse = vi.fn(() => sourceResponse(''));
        stubFetch(
            (url) =>
                url.endsWith('/views.json')
                    ? manifestResponse([
                          { path: 'home.jsx', route: '/home' },
                          { path: 'settings.jsx', route: '/settings' }
                      ])
                    : sourceResponse('export default () => null;'),
            runtimeResponse
        );
        const output = await renderPage('/home');
        await vi.waitFor(() => expect(output.querySelector('iframe')).not.toBeNull());
        const initialFrame = output.querySelector('iframe');
        const link = output.querySelector<HTMLAnchorElement>('a[href="/settings"]');

        if (!link) throw new Error('Missing settings navigation');

        // Act
        await act(async () => link.click());

        // Assert
        await vi.waitFor(() => {
            expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/settings');
            expect(output.querySelector('iframe')).not.toBeNull();
            expect(output.querySelector('iframe')).not.toBe(initialFrame);
        });
        expect(runtimeResponse).toHaveBeenCalledTimes(2);
    });

    it.each(['navigation', 'retry'])('recovers a failed runtime through %s', async (recovery) => {
        // Arrange
        let available = false;
        const runtimeResponse = vi.fn(() => (available ? sourceResponse('') : new Response(null, { status: 503 })));
        stubFetch(
            (url) =>
                url.endsWith('/views.json')
                    ? manifestResponse([
                          { path: 'home.jsx', route: '/home' },
                          { path: 'settings.jsx', route: '/settings' }
                      ])
                    : sourceResponse('export default () => null;'),
            runtimeResponse
        );
        const output = await renderPage('/home');
        await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this View'));
        expect(output.querySelector('iframe')).toBeNull();
        const failedRequests = runtimeResponse.mock.calls.length;
        const control =
            recovery === 'navigation'
                ? output.querySelector<HTMLAnchorElement>('a[href="/settings"]')
                : Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Retry');

        if (!control) throw new Error('Missing recovery control');

        // Act
        available = true;
        await act(async () => control.click());

        // Assert
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
        expect(runtimeResponse).toHaveBeenCalledTimes(failedRequests + 2);
        if (recovery === 'navigation')
            expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/settings');
    });

    it('retries failed source and runtime together from the source error', async () => {
        // Arrange
        let available = false;
        const sourceResponseForAttempt = vi.fn(() =>
            available ? sourceResponse('export default () => null;') : new Response(null, { status: 503 })
        );
        const runtimeResponse = vi.fn(() => (available ? sourceResponse('') : new Response(null, { status: 503 })));
        stubFetch(
            (url) =>
                url.endsWith('/views.json')
                    ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                    : sourceResponseForAttempt(),
            runtimeResponse
        );
        const output = await renderPage('/home');
        await vi.waitFor(async () => {
            await act(async () => {});
            expect(output.querySelector('h1')?.textContent).toBe('Unable to load this view');
            expect(
                mountedClient?.getQueryCache().find({ queryKey: ['view-runtime'], exact: false })?.state.status
            ).toBe('error');
        });
        expect(output.querySelector('iframe')).toBeNull();
        const failedRuntimeRequests = runtimeResponse.mock.calls.length;
        const failedSourceRequests = sourceResponseForAttempt.mock.calls.length;
        const retry = Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Retry');

        if (!retry) throw new Error('Missing source retry');

        // Act
        available = true;
        await act(async () => retry.click());

        // Assert
        await vi.waitFor(() => expect(output.querySelector('iframe')?.srcdoc).toContain('Content-Security-Policy'));
        expect(sourceResponseForAttempt).toHaveBeenCalledTimes(failedSourceRequests + 1);
        expect(runtimeResponse).toHaveBeenCalledTimes(failedRuntimeRequests + 2);
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
        const output = await renderPage('/home');
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
        const output = await renderPage('/missing');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain("We can't find that page")));
        expect(response).toHaveBeenCalledOnce();
    });

    it.each(['overlay', 'inset'])(
        'keeps the live View in place through modal open, close, and unmount with %s scrollbars',
        async (scrollbars) => {
            stubFetch((url) =>
                url.endsWith('/views.json')
                    ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                    : sourceResponse('export default function Home() { return null; }')
            );
            const html = document.documentElement;
            const body = document.body;
            const originalHtml = html.style.cssText;
            const originalBody = body.style.cssText;
            const originalScrollTop = html.scrollTop;
            const originalScrollLeft = html.scrollLeft;

            // Supply browser geometry without replacing the document's real lock or message channel.
            const width = window.innerWidth - (scrollbars === 'inset' ? 16 : 0);
            vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(width);
            vi.spyOn(body, 'clientWidth', 'get').mockReturnValue(width);
            vi.spyOn(html, 'scrollHeight', 'get').mockReturnValue(window.innerHeight * 2);

            // Exercise the compensation fallback when stable scrollbar gutters are unavailable.
            vi.spyOn(CSS, 'supports').mockReturnValue(false);

            try {
                html.style.paddingRight = '7px';
                html.style.overscrollBehaviorY = 'contain';
                body.style.paddingRight = '11px';
                body.style.overscrollBehaviorY = 'auto';
                body.style.overflowX = 'auto';
                body.style.overflowY = 'scroll';
                html.scrollTop = 320;
                html.scrollLeft = 24;
                const initialHtml = html.style.cssText;
                const initialBody = body.style.cssText;
                const output = await renderPage('/home');
                const port = await connectView(output);
                const frame = output.querySelector('iframe');

                if (!frame) throw new Error('Missing isolated frame');
                const parent = frame.parentElement;
                const frameDocument = frame.contentDocument;
                const frameWindow = frame.contentWindow;
                const source = frame.srcdoc;
                const sibling = output.querySelector<HTMLElement>('[data-path]');

                if (!sibling) throw new Error('Missing host navigation');
                const initialInert = sibling.inert;

                // Happy DOM lacks native top-layer promotion; keep the real mounted frame and document.
                Object.assign(frame, { showPopover: () => undefined, hidePopover: () => undefined });
                await act(async () => port.postMessage({ type: 'modal', open: true }));
                await vi.waitFor(() => expect(body.style.overflowY).toBe('hidden'));
                expect(frame.getAttribute('popover')).toBe('manual');
                expect(sibling.inert).toBe(true);
                expect(html.style.overscrollBehaviorY).toBe('none');
                expect(body.style.overscrollBehaviorY).toBe('none');
                expect(output.querySelector('iframe')).toBe(frame);
                expect(frame.parentElement).toBe(parent);
                expect(frame.contentDocument).toBe(frameDocument);
                expect(frame.contentWindow).toBe(frameWindow);
                expect(frame.srcdoc).toBe(source);

                // Closing the sandbox modal must not restart the View or leave host scrolling disabled.
                await act(async () => port.postMessage({ type: 'modal', open: false }));
                await vi.waitFor(() => {
                    expect(body.style.cssText).toBe(initialBody);
                    expect(html.style.cssText).toBe(initialHtml);
                });
                expect(output.querySelector('iframe')).toBe(frame);
                expect(frame.parentElement).toBe(parent);
                expect(frame.contentDocument).toBe(frameDocument);
                expect(frame.contentWindow).toBe(frameWindow);
                expect(frame.srcdoc).toBe(source);
                expect(frame.hasAttribute('popover')).toBe(false);
                expect(sibling.inert).toBe(initialInert);
                expect(html.scrollTop).toBe(320);
                expect(html.scrollLeft).toBe(24);

                // A second opening followed by route teardown must release the same document ownership.
                await act(async () => port.postMessage({ type: 'modal', open: true }));
                await vi.waitFor(() => expect(body.style.overflowY).toBe('hidden'));
                await act(async () => root?.unmount());
                root = undefined;
                await vi.waitFor(() => {
                    expect(body.style.cssText).toBe(initialBody);
                    expect(html.style.cssText).toBe(initialHtml);
                });
                expect(sibling.inert).toBe(initialInert);
                expect(html.scrollTop).toBe(320);
                expect(html.scrollLeft).toBe(24);
            } finally {
                await act(async () => root?.unmount());
                root = undefined;

                // Base UI releases its shared scroll lock on the next task.
                await vi.waitFor(() => expect(body.style.overflowY).toBe('scroll'));
                html.style.cssText = originalHtml;
                body.style.cssText = originalBody;
                html.scrollTop = originalScrollTop;
                html.scrollLeft = originalScrollLeft;
            }
        }
    );

    it.each(['view', 'dialog'])(
        'keeps scrolling locked until both overlays release, %s unmounts first',
        async (first) => {
            stubFetch((url) =>
                url.endsWith('/views.json')
                    ? manifestResponse([{ path: 'home.jsx', route: '/home' }])
                    : sourceResponse('export default function Home() { return null; }')
            );
            const html = document.documentElement;
            const body = document.body;
            const originalHtml = html.getAttribute('style');
            const originalBody = body.getAttribute('style');
            const dialogContainer = document.createElement('section');
            body.append(dialogContainer);
            const dialogRoot = createRoot(dialogContainer);
            let dialogMounted = true;

            try {
                html.style.scrollbarGutter = 'stable both-edges';
                const initialHtml = html.style.cssText;
                const initialBody = body.style.cssText;
                const output = await renderPage('/home');
                const port = await connectView(output);
                const frame = output.querySelector('iframe');

                if (!frame) throw new Error('Missing isolated frame');

                // Happy DOM does not implement top-layer promotion.
                Object.assign(frame, { showPopover: () => undefined, hidePopover: () => undefined });
                await act(async () => port.postMessage({ type: 'modal', open: true }));
                await vi.waitFor(() => expect(body.style.overflowY).toBe('hidden'));
                await act(async () =>
                    dialogRoot.render(
                        <Dialog.Root open>
                            <Dialog.Portal>
                                <Dialog.Popup>
                                    <Dialog.Title>Preview</Dialog.Title>
                                </Dialog.Popup>
                            </Dialog.Portal>
                        </Dialog.Root>
                    )
                );

                // Exercise both ownership orders, including a View disappearing while its modal is active.
                if (first === 'view') {
                    await act(async () => root?.unmount());
                    root = undefined;
                } else {
                    await act(async () => dialogRoot.unmount());
                    dialogMounted = false;
                }

                await new Promise((resolve) => setTimeout(resolve, 20));
                expect(body.style.overflowY).toBe('hidden');
                expect(html.style.scrollbarGutter).toBe('stable both-edges');

                if (first === 'view') {
                    await act(async () => dialogRoot.unmount());
                    dialogMounted = false;
                } else {
                    await act(async () => root?.unmount());
                    root = undefined;
                }

                await vi.waitFor(() => {
                    expect(body.style.cssText).toBe(initialBody);
                    expect(html.style.cssText).toBe(initialHtml);
                });
            } finally {
                if (dialogMounted) await act(async () => dialogRoot.unmount());
                dialogContainer.remove();

                if (originalHtml === null) html.removeAttribute('style');
                else html.setAttribute('style', originalHtml);

                if (originalBody === null) body.removeAttribute('style');
                else body.setAttribute('style', originalBody);
            }
        }
    );

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

        expect(args[0]).toMatchObject({ appearance: { theme: 'system' } });

        return ports[0];
    }

    /** Mounts the real page with isolated queries and routing. */
    async function renderPage(initialPath = '/', viewsUrl = '/views.json'): Promise<HTMLDivElement> {
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
                            <Routes>
                                <Route
                                    element={
                                        <>
                                            <Location />
                                            <SolutionPage
                                                action={null}
                                                breadcrumb={null}
                                                formatTitle={(title) => `${title ?? 'Untitled'} | Solution`}
                                                viewsUrl={viewsUrl}
                                            />
                                        </>
                                    }
                                    path="*"
                                />
                            </Routes>
                        </MemoryRouter>
                    </QueryClientProvider>
                </ApiErrorContext>
            );
        });

        return container;
    }
});

/** Exposes the memory-router location for assertions. */
function Location() {
    const location = useLocation();

    return <output data-path={`${location.pathname}${location.search}${location.hash}`} />;
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(
    response: (url: string, request: Request) => Response | Promise<Response>,
    runtimeResponse: (url: string, request: Request) => Response | Promise<Response> = () => sourceResponse('')
): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        // Normalize standard fetch inputs without depending on Ky's argument representation.
        const request = input instanceof Request ? input : new Request(input, init);
        const url = request.url;

        const pathname = new URL(url).pathname;

        if (pathname.endsWith('/views/runtime.js') || pathname.endsWith('/views/runtime.css'))
            return runtimeResponse(url, request);

        return response(url, request);
    });
}

/** Creates a catalog pinned to the empty runtime assets supplied by the transport fixture. */
function manifestResponse(
    views: readonly { path: string; route: string; width?: 'wide' | 'compact' }[],
    tabs?: readonly { route: string; label?: string }[]
): Response {
    return Response.json({ views, tabs, runtime: { version: createHash('sha256').update('\n').digest('hex') } });
}

/** Creates a source fetch response. */
function sourceResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}

/** Controls completion of an HTTP request independently of the other startup requests. */
function pendingResponse() {
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>((finish) => {
        resolve = finish;
    });

    return { promise, resolve };
}
