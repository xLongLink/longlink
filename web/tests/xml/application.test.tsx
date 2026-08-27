// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationRuntime } from '@/components/Application';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const navigation = vi.hoisted(() => ({ destination: '' }));

vi.mock('@/xml', async (importOriginal) => {
    const xml = await importOriginal<typeof import('@/xml')>();

    return {
        ...xml,
        RenderXML: ({
            ctx,
        }: {
            ctx: {
                scope: { bindings: { params: Record<string, string> } };
                services: { navigate: (url: string) => void };
            };
        }) => (
            <button onClick={() => ctx.services.navigate(navigation.destination)}>
                {ctx.scope.bindings.params.issueId}
            </button>
        ),
    };
});

describe('ApplicationRuntime', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let locationAssignDescriptor: PropertyDescriptor | undefined;

    afterEach(async () => {
        if (root) {
            await act(async () => root?.unmount());
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
        await act(async () =>
            vi.waitFor(() => expect(output.textContent).toContain('Unable to load this application'))
        );
        expect(output.textContent).toContain('Manifest unavailable');
    });

    it('redirects an empty route to the first non-index static tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/pages.json')
                ? jsonResponse([page('index', '/'), page('home', '/home')])
                : xmlResponse('<Text>Home</Text>')
        );

        // Act
        const output = await renderRuntime('/');

        // Assert
        await act(async () =>
            vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-tabs')).toBe('/,/home'))
        );
        await act(async () =>
            vi.waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'))
        );
    });

    it('renders an empty manifest response', async () => {
        // Arrange
        stubFetch(() => jsonResponse([]));

        // Act
        const output = await renderRuntime();

        // Assert
        await act(async () =>
            vi.waitFor(() => expect(output.textContent).toContain('Unexpected application response'))
        );
        expect(output.textContent).toContain('The application did not expose any pages to render.');
    });

    it('renders a page failure after loading the manifest', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home')]);
            return new Response(JSON.stringify({ detail: 'Page unavailable' }), { status: 503 });
        });

        // Act
        const output = await renderRuntime('/home');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page')));
        expect(output.textContent).toContain('Page unavailable');
    });

    it.each(['https://example.com/page.xml', '//example.com/page.xml'])(
        'rejects external manifest page paths before fetching the page: %s',
        async (path) => {
            // Arrange
            const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
                const url = input instanceof Request ? input.url : String(input);

                if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home', path)]);
                throw new Error('Page fetch must not occur');
            });
            vi.stubGlobal('fetch', fetchRequest);

            // Act
            const output = await renderRuntime('/home');

            // Assert
            await act(async () =>
                vi.waitFor(() => expect(output.textContent).toContain('Unable to load this application'))
            );
            expect(output.textContent).toContain('Page path must be app-relative');
            expect(fetchRequest).toHaveBeenCalledOnce();
        }
    );

    it('renders dynamic route parameters', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('issue', '/issues/:issueId')]);
            return xmlResponse('<longlink />');
        });

        // Act
        const output = await renderRuntime('/issues/42');

        // Assert
        await act(async () => vi.waitFor(() => expect(output.textContent).toContain('42')));
    });

    it('rejects unmatched routes', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('issue', '/issues/:issueId')]);
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
            if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home')]);
            return xmlResponse('<longlink />');
        });
        navigation.destination = '/next';
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
            if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home')]);
            return xmlResponse('<longlink />');
        });
        navigation.destination = 'https://example.com/next';
        const output = await renderRuntime('/home');

        await act(async () => vi.waitFor(() => expect(output.querySelector('button')).not.toBeNull()));

        // Act
        await act(async () => output.querySelector('button')?.click());

        // Assert
        expect(assign).toHaveBeenCalledWith('https://example.com/next');
    });

    async function renderRuntime(initialPath = '/'): Promise<HTMLDivElement> {
        const container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        await act(async () => {
            root?.render(
                <QueryClientProvider client={client}>
                    <MemoryRouter initialEntries={[initialPath]}>
                        <Routes>
                            <Route
                                element={
                                    <ApplicationRuntime>
                                        {({ content, tabs }) => (
                                            <>
                                                <Location tabs={tabs.map((tab) => tab.href).join(',')} />
                                                {content}
                                            </>
                                        )}
                                    </ApplicationRuntime>
                                }
                                path="*"
                            />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
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

/** Creates a minimal manifest page. */
function page(tab: string, route: string, path = `${tab}.xml`) {
    return { name: tab, path, route, tab };
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
