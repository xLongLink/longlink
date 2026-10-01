// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { cleanupMountedRoot } from './helpers';
import { ApiErrorContext } from '@/lib/errors';
import { createQueryRuntime } from '@/lib/react-query';
import { SolutionRuntime } from '@/components/Solution';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

describe('SolutionRuntime', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(root);
        root = undefined;
        vi.unstubAllGlobals();
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
                : xmlResponse('<longlink><Text>Home</Text></longlink>')
        );

        // Act
        const output = await renderRuntime('/');

        // Assert
        // Router navigation does not settle inside act, so observe it directly.
        await vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'));
        expect(output.querySelector('[data-path]')?.getAttribute('data-tabs')).toBe('/home');
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Home')));
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
                return Response.json([view('home', '/home', 'https://example.com/view.view')]);
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
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return Response.json([view('issue', '/issues/:issueId')]);
            return xmlResponse('<longlink><Text>${params.issueId}</Text></longlink>');
        });

        // Act
        const output = await renderRuntime('/issues/42');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('42')));
    });

    it('keeps a custom manifest URL and fetches View markup beside it', async () => {
        // Arrange
        const requests: Request[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            if (!(input instanceof Request)) throw new Error('Expected a Request at the HTTP boundary');
            requests.push(input);

            if (input.url.endsWith('/proxy/views.json?version=1#manifest')) {
                return Response.json([view('home', '/home')]);
            }

            return xmlResponse('<longlink><Text>Welcome</Text></longlink>');
        });

        // Act
        const output = await renderRuntime('/home', '/proxy/views.json?version=1#manifest');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Welcome')));
        expect(requests).toHaveLength(2);
        const [manifestRequest, viewRequest] = requests;
        const manifestUrl = new URL(manifestRequest.url);
        const viewUrl = new URL(viewRequest.url);
        expect(`${manifestUrl.pathname}${manifestUrl.search}${manifestUrl.hash}`).toBe(
            '/proxy/views.json?version=1#manifest'
        );
        expect(viewUrl.pathname).toBe('/proxy/home.view');
        expect(viewRequest.headers.get('accept')).toBe('text/plain');
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

    it('navigates same-origin XML destinations through the client router', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return Response.json([view('home', '/home')]);
            return xmlResponse('<longlink><Button to="/next">Continue</Button></longlink>');
        });
        const output = await renderRuntime('/home');

        await act(async () => vi.waitFor(() => expect(output.querySelector('button')).not.toBeNull()));

        // Act
        await act(async () => output.querySelector('button')?.click());

        // Assert
        await act(async () =>
            vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/next'))
        );
    });

    it('renders external XML destinations as anchors', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return Response.json([view('home', '/home')]);
            return xmlResponse('<longlink><Link href="https://example.com/next">Continue</Link></longlink>');
        });
        const output = await renderRuntime('/home');

        await act(async () => vi.waitFor(() => expect(output.querySelector('a')).not.toBeNull()));

        // Assert
        expect(output.querySelector('a')?.getAttribute('href')).toBe('https://example.com/next');
    });

    async function renderRuntime(initialPath = '/', viewsUrl = '/views.json'): Promise<HTMLDivElement> {
        const container = document.createElement('div');
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        const { client, reportError } = createQueryRuntime(() => {}, false);
        client.setDefaultOptions({ queries: { retry: false } });

        await act(async () => {
            mountedRoot.render(
                <ApiErrorContext value={reportError}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={[initialPath]}>
                            <Routes>
                                <Route
                                    element={
                                        <SolutionRuntime viewsUrl={viewsUrl}>
                                            {({ content, tabs }) => (
                                                <>
                                                    <Location tabs={tabs.map((tab) => tab.href).join(',')} />
                                                    {content}
                                                </>
                                            )}
                                        </SolutionRuntime>
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
function Location({ tabs }: { tabs: string }) {
    const location = useLocation();

    return <output data-path={`${location.pathname}${location.search}${location.hash}`} data-tabs={tabs} />;
}

/** Creates a minimal manifest view. */
function view(name: string, route: string, path = `${name}.view`) {
    return { name, path, route };
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string) => Response): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);

        return response(url);
    });
}

/** Creates an XML fetch response. */
function xmlResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
