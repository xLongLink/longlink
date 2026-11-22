// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { z } from 'zod';
import { flushSync } from 'react-dom';
import { it, vi, expect } from 'vitest';
import { useApi } from '@/lib/hooks/use-api';
import { createRoot } from 'react-dom/client';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import { Link, Route, Routes, MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('resets the failed read when navigating to another page', async () => {
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
                </MemoryRouter>
            );
        });

        // Assert
        await vi.waitFor(() => expect(output.querySelector('[role="status"] h1')).not.toBeNull());
        expect(errors).toEqual([
            expect.objectContaining({ name: 'ApiError', status: 503, message: 'Orders unavailable' })
        ]);
        expect(transport).toHaveBeenCalledTimes(1);

        // Act
        const link = output.querySelector<HTMLAnchorElement>('a[href="/healthy"]');
        if (!link) throw new Error('Expected a link to healthy orders');
        link.click();

        // Assert
        await vi.waitFor(() => expect(output.querySelector('p')?.textContent).toBe('Healthy orders'));
        expect(output.querySelector('[role="status"] h1')).toBeNull();
        expect(transport.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)))).toEqual([
            'http://localhost/api/orders/failed',
            'http://localhost/api/orders/healthy'
        ]);
        expect(errors).toHaveLength(1);
    } finally {
        root.unmount();
        client.clear();
        output.remove();
        transport.mockRestore();
    }
});
