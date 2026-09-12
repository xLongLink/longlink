// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { createQueryRuntime } from '@/lib/react-query';
import { SolutionRuntime } from '@/components/Solution';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

describe('SolutionRuntime', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let locationAssignDescriptor: PropertyDescriptor | undefined;

    afterEach(async () => {
        if (root) {
            const mountedRoot = root;
            await act(async () => mountedRoot.unmount());
        }
        root = undefined;
        vi.unstubAllGlobals();

        // Restore direct location-method replacements made by navigation tests.
        if (locationAssignDescriptor) {
            Object.defineProperty(window.location, 'assign', locationAssignDescriptor);
        } else {
            Reflect.deleteProperty(window.location, 'assign');
        }
        locationAssignDescriptor = undefined;
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

    it('redirects an empty route to the first non-index static tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/views.json')
                ? jsonResponse([view('index', '/'), view('home', '/home')])
                : xmlResponse('<longlink><Text>Home</Text></longlink>')
        );

        // Act
        const output = await renderRuntime('/');

        // Assert
        await act(async () =>
            vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-tabs')).toBe('/home'))
        );
        await act(async () =>
            vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'))
        );
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Home')));
    });

    it('renders an empty manifest response', async () => {
        // Arrange
        stubFetch(() => jsonResponse([]));

        // Act
        const output = await renderRuntime();

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unexpected solution response')));
        expect(output.textContent).toContain('The solution did not expose any views to render.');
    });

    it('renders a view failure after loading the manifest', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return jsonResponse([view('home', '/home')]);
            return new Response(JSON.stringify({ detail: 'View unavailable' }), { status: 503 });
        });

        // Act
        const output = await renderRuntime('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this view')));
        expect(output.textContent).toContain('The view could not be loaded.');
    });

    it.each(['https://example.com/view.xml', '//example.com/view.xml'])(
        'rejects external manifest view paths before fetching the view: %s',
        async (path) => {
            // Arrange
            const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
                const url = input instanceof Request ? input.url : String(input);

                if (url.endsWith('/views.json')) return jsonResponse([view('home', '/home', path)]);
                throw new Error('View fetch must not occur');
            });
            vi.stubGlobal('fetch', fetchRequest);

            // Act
            const output = await renderRuntime('/home');

            // Assert
            await act(async () =>
                vi.waitFor(() => expect(output.textContent).toContain('Unable to load this solution'))
            );
            expect(output.textContent).toContain('The solution definition could not be loaded.');
            expect(fetchRequest).toHaveBeenCalledOnce();
        }
    );

    it('renders dynamic route parameters', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return jsonResponse([view('issue', '/issues/:issueId')]);
            return xmlResponse('<longlink><Text>${params.issueId}</Text></longlink>');
        });

        // Act
        const output = await renderRuntime('/issues/42');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('42')));
    });

    it('rejects unmatched routes', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return jsonResponse([view('issue', '/issues/:issueId')]);
            return xmlResponse('<longlink />');
        });

        // Act
        const output = await renderRuntime('/missing');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain("We can't find that page")));
    });

    it('navigates same-origin XML destinations through the client router', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return jsonResponse([view('home', '/home')]);
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

    it('assigns external XML destinations to the browser location', async () => {
        // Arrange
        const assign = vi.fn();
        locationAssignDescriptor = Object.getOwnPropertyDescriptor(window.location, 'assign');
        Object.defineProperty(window.location, 'assign', { configurable: true, value: assign });
        stubFetch((url) => {
            if (url.endsWith('/views.json')) return jsonResponse([view('home', '/home')]);
            return xmlResponse(
                '<longlink><Action><Link href="https://example.com/next">Continue</Link></Action></longlink>'
            );
        });
        const output = await renderRuntime('/home');

        await act(async () => vi.waitFor(() => expect(output.querySelector('a')).not.toBeNull()));

        // Act
        await act(async () => output.querySelector('a')?.click());

        // Assert
        await act(async () => vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://example.com/next')));
    });

    async function renderRuntime(initialPath = '/'): Promise<HTMLDivElement> {
        const container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        const { client, reportError } = createQueryRuntime(vi.fn(), false);
        client.setDefaultOptions({ queries: { retry: false } });

        await act(async () => {
            root?.render(
                <ApiErrorContext value={reportError}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={[initialPath]}>
                            <Routes>
                                <Route
                                    element={
                                        <SolutionRuntime>
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
function view(name: string, route: string, path = `${name}.xml`) {
    return { name, path, route };
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string) => Response): void {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);

        return response(url);
    });
}

/** Creates a JSON fetch response. */
function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

/** Creates an XML fetch response. */
function xmlResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
