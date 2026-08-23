// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationRuntime } from '@/components/Application';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ApplicationRuntime XML integration', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        vi.unstubAllGlobals();

        if (root) {
            const renderedRoot = root;
            await act(async () => renderedRoot.unmount());
        }
        root = undefined;
    });

    it('fetches, initializes, and renders a manifest-defined XML page', async () => {
        // Arrange
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            const url = input instanceof Request ? input.url : String(input);

            if (url.endsWith('/pages.json')) {
                return new Response(JSON.stringify([{ name: 'home', path: 'home.xml', route: 'home', tab: 'home' }]), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(
                '<longlink><State id="page" title="Welcome" /><Heading level="1">${page.title}</Heading></longlink>',
                {
                    headers: { 'Content-Type': 'application/xml' },
                }
            );
        });
        vi.stubGlobal('fetch', fetchRequest);
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
                                element={<ApplicationRuntime>{({ content }) => content}</ApplicationRuntime>}
                                path="*"
                            />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            );
        });

        // Assert
        await act(async () => vi.waitFor(() => expect(fetchRequest).toHaveBeenCalledTimes(2)));
        await act(async () => vi.waitFor(() => expect(container.textContent).toContain('Welcome')));
    });
});
