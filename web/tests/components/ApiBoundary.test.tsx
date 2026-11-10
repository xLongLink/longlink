// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { z } from 'zod';
import { flushSync } from 'react-dom';
import { it, vi, expect } from 'vitest';
import { renderStatic } from '../render';
import { useApi } from '@/lib/hooks/use-api';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import { ApiBoundary } from '@/components/ApiBoundary';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { Link, Route, Routes, MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('uses the caller-selected loading fallback for suspended reads', () => {
    // Arrange
    const pending = new Promise<never>(() => undefined);

    function Pending(): never {
        throw pending;
    }

    // Act
    const output = renderStatic(
        <ApiErrorContext value={() => undefined}>
            <ApiBoundary fallback={<p>Loading orders</p>}>
                <Pending />
            </ApiBoundary>
        </ApiErrorContext>
    );

    // Assert
    expect(output.textContent).toBe('Loading orders');
});

it('recovers a failed read when navigating within the same API boundary without retrying', async () => {
    // Arrange
    const schema = z.object({ name: z.string() });
    const errors: unknown[] = [];

    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected API request'))
        .mockResolvedValueOnce(Response.json({ detail: 'Orders unavailable' }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ name: 'Healthy orders' }));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output, { onCaughtError: () => undefined });

    /** Reads each route through the real validated API query. */
    function Orders({ path }: { path: string }) {
        const [orders] = useApi(path, schema);

        return <p>{orders.name}</p>;
    }

    try {
        // Act
        flushSync(() => {
            root.render(
                <MemoryRouter initialEntries={['/failed']}>
                    <Theme theme={stoneTheme} mode="dark">
                        <LayerProvider>
                            <QueryClientProvider client={client}>
                                <ApiErrorContext value={(error) => errors.push(error)}>
                                    <Link to="/healthy">Healthy orders</Link>
                                    <ApiBoundary>
                                        <Routes>
                                            <Route path="/failed" element={<Orders path="/api/orders/failed" />} />
                                            <Route path="/healthy" element={<Orders path="/api/orders/healthy" />} />
                                        </Routes>
                                    </ApiBoundary>
                                </ApiErrorContext>
                            </QueryClientProvider>
                        </LayerProvider>
                    </Theme>
                </MemoryRouter>
            );
        });

        // Assert
        await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page.'));
        expect(output.querySelector('button')?.textContent).toBe('Retry');
        expect(errors).toEqual([
            expect.objectContaining({ name: 'ApiError', status: 503, message: 'Orders unavailable' }),
        ]);
        expect(transport).toHaveBeenCalledTimes(1);

        // Act
        const link = output.querySelector('a');
        expect(link?.getAttribute('href')).toBe('/healthy');
        link?.click();

        // Assert
        await vi.waitFor(() => expect(output.querySelector('p')?.textContent).toBe('Healthy orders'));
        expect(output.textContent).not.toContain('Unable to load this page.');
        expect(output.querySelector('button')).toBeNull();
        expect(transport.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)))).toEqual([
            'http://localhost/api/orders/failed',
            'http://localhost/api/orders/healthy',
        ]);
    } finally {
        root.unmount();
        client.clear();
        output.remove();
        transport.mockRestore();
    }
});
