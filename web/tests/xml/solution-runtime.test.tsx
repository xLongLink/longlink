// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { createQueryRuntime } from '@/lib/react-query';
import { SolutionRuntime } from '@/components/Solution';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    api: apiRequest,
}));

describe('SolutionRuntime XML integration', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        if (root) {
            const mountedRoot = root;
            await act(async () => mountedRoot.unmount());
        }
        root = undefined;
        apiRequest.mockReset();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('fetches, initializes, and renders a manifest-defined XML view', async () => {
        // Arrange
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        apiRequest.mockImplementation((url: string, options?: RequestInit) => {
            if (url.endsWith('/views.json')) {
                return { json: async () => [{ name: 'home', path: 'home.xml', route: '/home' }] };
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
        const { client, reportError } = createQueryRuntime(vi.fn(), false);
        client.setDefaultOptions({ queries: { retry: false } });
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        // Act
        await act(async () => {
            renderedRoot.render(
                <ApiErrorContext value={reportError}>
                    <QueryClientProvider client={client}>
                        <MemoryRouter initialEntries={['/home']}>
                            <Routes>
                                <Route
                                    element={
                                        <SolutionRuntime viewsUrl="/proxy/views.json" requestBaseUrl="/proxy/">
                                            {({ content }) => content}
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

        // Deliver the manifest notification and commit the render that starts the XML query.
        await act(async () => vi.runOnlyPendingTimersAsync());

        // Deliver the XML notification and finish renderer setup before inspecting the DOM.
        await act(async () => vi.runOnlyPendingTimersAsync());

        // Assert
        expect(container.textContent).toContain('Welcome');
        expect(apiRequest.mock.calls.map(([url]) => url)).toEqual(['/proxy/views.json', '/proxy/home.xml']);
    });
});
