// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import PaymentMethods from '@/platform/routes/orgs/payment-methods';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('attempts checkout offline, guards rapid activation, and permits retry after a failed registration', async () => {
    // Arrange
    const base = '/api/v1/organizations/00000000-0000-4000-8000-000000000002';
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
    const reportError = vi.fn();
    let finish: (response: Response) => void = () => {};
    const checkout = new Promise<Response>((resolve) => {
        finish = resolve;
    });
    const requests: string[] = [];
    const destination = 'https://checkout.stripe.com/c/setup_123';
    const wasOnline = onlineManager.isOnline();

    // Keep the real checkout transport and submission lifecycle behind a controlled HTTP response.
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method !== 'POST' || path !== `${base}/cards/checkout`) {
            throw new Error(`Unexpected request: ${request.method} ${path}`);
        }

        requests.push(path);
        return requests.length === 1 ? checkout : Response.json({ url: destination });
    });
    const navigate = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    client.setQueryData(
        ['api', `${base}/usage`],
        schemas.zOrganizationUsage.parse({ users: 1, solutions: 1, stripe_enabled: true, has_payment_method: false })
    );
    client.setQueryData(['api', `${base}/cards`], []);

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={reportError}>
                    <PaymentMethods base={base} canManage />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                const register = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Add card'
                );

                if (!register) throw new Error('Expected card registration');

                // Same-tick activations must not create multiple hosted checkout sessions.
                // Act
                await act(async () => {
                    onlineManager.setOnline(false);
                    register.click();
                    register.click();
                });
                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                await vi.waitFor(() => expect(register.disabled).toBe(true));
                expect(navigate).not.toHaveBeenCalled();

                // A failed checkout must report once, release the guard, and leave registration usable.
                await act(async () => finish(Response.json({ detail: 'Checkout unavailable' }, { status: 503 })));
                await vi.waitFor(() => expect(register.disabled).toBe(false));
                expect(reportError).toHaveBeenCalledOnce();
                expect(navigate).not.toHaveBeenCalled();

                await act(async () => register.click());
                await vi.waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith(destination));
                expect(requests).toHaveLength(2);
                expect(reportError).toHaveBeenCalledOnce();
            }
        );
    } finally {
        onlineManager.setOnline(wasOnline);
        finish(Response.json({ detail: 'Checkout unavailable' }, { status: 503 }));
        transport.mockRestore();
        navigate.mockRestore();
        client.clear();
    }
});
