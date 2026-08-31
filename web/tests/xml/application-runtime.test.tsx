// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationRuntime } from '@/components/Application';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: apiRequest }));

describe('ApplicationRuntime XML integration', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        if (root) {
            const mountedRoot = root;
            await act(async () => mountedRoot.unmount());
        }
        root = undefined;
        apiRequest.mockReset();
        vi.unstubAllGlobals();
    });

    it('fetches, initializes, and renders a manifest-defined XML page', async () => {
        // Arrange
        apiRequest.mockImplementation((url: string, options?: RequestInit) => {
            if (url.endsWith('/pages.json')) {
                return { json: async () => [{ name: 'home', path: 'home.xml', route: '/home', tab: 'home' }] };
            }

            expect(options?.headers).toEqual({ Accept: 'application/xml' });
            return {
                text: async () =>
                    '<longlink><State id="page" title="Welcome" /><Heading level="1">${page.title}</Heading></longlink>',
            };
        });
        const container = document.createElement('div');
        const renderedRoot = createRoot(container);
        root = renderedRoot;
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        // Act
        await act(async () => {
            renderedRoot.render(
                <QueryClientProvider client={client}>
                    <MemoryRouter initialEntries={['/home']}>
                        <Routes>
                            <Route
                                element={
                                    <ApplicationRuntime pagesUrl="/proxy/pages.json" requestBaseUrl="/proxy/">
                                        {({ content }) => content}
                                    </ApplicationRuntime>
                                }
                                path="*"
                            />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            );
        });

        // Assert
        await act(async () =>
            vi.waitFor(() =>
                expect(apiRequest.mock.calls.map(([url]) => url)).toEqual(['/proxy/pages.json', '/proxy/home.xml'])
            )
        );
        await act(async () => vi.waitFor(() => expect(container.textContent).toContain('Welcome')));
    });
});
