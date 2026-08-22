// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationRuntime } from '@/components/Application';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';

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

type Page = {
    path: string;
    route: string;
    tab: string;
    name?: string;
};

describe('ApplicationRuntime', () => {
    let container: HTMLDivElement | undefined;
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        if (root) {
            await act(async () => root?.unmount());
        }
        vi.unstubAllGlobals();
        container?.remove();
        container = undefined;
        root = undefined;
    });

    it('renders a manifest failure', async () => {
        // Arrange
        stubFetch(() => new Response(JSON.stringify({ detail: 'Manifest unavailable' }), { status: 503 }));

        // Act
        const output = await renderRuntime();

        // Assert
        await waitFor(() => expect(output.textContent).toContain('Unable to load this application'));
        expect(output.textContent).toContain('Manifest unavailable');
    });

    it('redirects an empty route to the first static tab', async () => {
        // Arrange
        stubFetch((url) =>
            url.endsWith('/pages.json') ? jsonResponse([page('home', '/home')]) : xmlResponse('<Text>Home</Text>')
        );

        // Act
        const output = await renderRuntime('/');

        // Assert
        expect(output.querySelector('[data-path]')?.getAttribute('data-route-path')).toBe('');
        await waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-tabs')).toBe('/home'));
        await waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/home'));
    });

    it('renders dynamic route parameters and rejects unmatched routes', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('issue', '/issues/:issueId')]);
            return xmlResponse('<longlink />');
        });

        // Act
        const dynamicOutput = await renderRuntime('/issues/42');

        // Assert
        await waitFor(() => expect(dynamicOutput.textContent).toContain('42'));

        await unmountRuntime();
        const unmatchedOutput = await renderRuntime('/missing');
        await waitFor(() => expect(unmatchedOutput.textContent).toContain("We can't find that page"));
    });

    it('navigates same-origin XML destinations through the client router', async () => {
        // Arrange
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home')]);
            return xmlResponse('<longlink />');
        });
        navigation.destination = '/next';
        const output = await renderRuntime('/home');

        await waitFor(() => expect(output.querySelector('button')).not.toBeNull());

        // Act
        await act(async () => output.querySelector('button')?.click());

        // Assert
        await waitFor(() => expect(output.querySelector('[data-path]')?.getAttribute('data-path')).toBe('/next'));
    });

    it('assigns external XML destinations to the browser location', async () => {
        // Arrange
        const assign = vi.fn();
        Object.defineProperty(window.location, 'assign', { configurable: true, value: assign });
        stubFetch((url) => {
            if (url.endsWith('/pages.json')) return jsonResponse([page('home', '/home')]);
            return xmlResponse('<longlink />');
        });
        navigation.destination = 'https://example.com/next';
        const output = await renderRuntime('/home');

        await waitFor(() => expect(output.querySelector('button')).not.toBeNull());

        // Act
        await act(async () => output.querySelector('button')?.click());

        // Assert
        expect(assign).toHaveBeenCalledWith('https://example.com/next');
    });

    async function renderRuntime(initialPath = '/'): Promise<HTMLDivElement> {
        container = document.createElement('div');
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

    async function unmountRuntime(): Promise<void> {
        await act(async () => root?.unmount());
        container?.remove();
        container = undefined;
        root = undefined;
    }
});

/** Waits for an asynchronous React update within an act scope. */
async function waitFor(assertion: () => void): Promise<void> {
    await act(async () => vi.waitFor(assertion));
}

/** Exposes the memory-router location for assertions. */
function Location({ tabs }: { tabs: string }) {
    const location = useLocation();
    const { '*': routePath } = useParams();

    return (
        <output
            data-path={`${location.pathname}${location.search}${location.hash}`}
            data-route-path={routePath}
            data-tabs={tabs}
        />
    );
}

/** Creates a minimal manifest page. */
function page(tab: string, route: string): Page {
    return { name: tab, path: `${tab}.xml`, route, tab };
}

/** Stubs fetch at the runtime's HTTP boundary. */
function stubFetch(response: (url: string) => Response): void {
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);

        return new Promise<Response>((resolve) => setTimeout(() => resolve(response(url))));
    });
}

/** Creates a JSON fetch response. */
function jsonResponse(body: Page[]): Response {
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

/** Creates an XML fetch response. */
function xmlResponse(body: string): Response {
    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
