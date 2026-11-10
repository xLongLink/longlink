// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { flushSync } from 'react-dom';
import { it, vi, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import Invoices from '@/platform/routes/orgs/Invoices';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const invoice = {
    id: 'in_acme',
    total: 1200,
    number: 'ACME-001',
    status: 'paid',
    currency: 'usd',
    created_at: '2026-10-01T00:00:00Z',
    has_pdf: true,
    hosted_invoice_url: 'https://example.com/invoices/acme',
};

/** Mounts the section with real providers and an isolated HTTP API boundary. */
async function withInvoices(
    respond: (request: Request) => Response | Promise<Response>,
    check: (output: HTMLElement, render: (canManage: boolean) => void, errors: unknown[]) => Promise<void>
) {
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        return respond(request);
    });

    const base = '/api/v1/organizations/acme';
    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output, { onCaughtError: () => undefined });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const errors: unknown[] = [];

    // Keep all request and rendering state local to this mounted section.
    function render(canManage: boolean) {
        flushSync(() => {
            root.render(
                <MemoryRouter>
                    <Theme theme={stoneTheme} mode="dark">
                        <LayerProvider>
                            <QueryClientProvider client={client}>
                                <ApiErrorContext value={(error) => errors.push(error)}>
                                    <Invoices base={base} canManage={canManage} />
                                </ApiErrorContext>
                            </QueryClientProvider>
                        </LayerProvider>
                    </Theme>
                </MemoryRouter>
            );
        });
    }

    try {
        await check(output, render, errors);
    } finally {
        root.unmount();
        client.clear();
        output.remove();
        transport.mockRestore();
    }
}

it('loads private invoices only with owner access and hides them when access is revoked', async () => {
    // Arrange
    const requests: string[] = [];
    let release: () => void = () => undefined;

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    try {
        await withInvoices(
            async (request) => {
                requests.push(`${request.method} ${new URL(request.url).pathname}`);
                await pending;

                return Response.json([invoice]);
            },
            async (output, render) => {
                // Act
                render(false);

                // Assert
                expect(output.querySelector('h2')?.textContent).toBe('Invoices');
                expect(output.textContent).toContain('An organization owner can view invoices.');
                expect(output.textContent).not.toContain('Loading invoices…');
                expect(requests).toEqual([]);

                // Act
                render(true);
                await vi.waitFor(() => expect(requests).toEqual(['GET /api/v1/organizations/acme/invoices']));

                // Assert
                expect(output.querySelector('h2')?.textContent).toBe('Invoices');
                expect(output.textContent).toContain('Loading invoices…');
                expect(output.textContent).not.toContain('An organization owner can view invoices.');
                expect(output.querySelector('table')).toBeNull();

                // Act
                release();

                // Assert
                await vi.waitFor(() => expect(output.querySelector('table')?.textContent).toContain('ACME-001'));
                expect(output.textContent).not.toContain('Loading invoices…');
                expect(output.querySelector('a[href="https://example.com/invoices/acme"]')?.textContent).toContain(
                    'ACME-001'
                );
                expect(
                    output.querySelector('a[href$="/api/v1/organizations/acme/invoices/in_acme/pdf"]')?.textContent
                ).toContain('PDF');
                expect(
                    output
                        .querySelector('a[href$="/api/v1/organizations/acme/invoices/in_acme/pdf"]')
                        ?.getAttribute('target')
                ).toBe('_blank');
                expect(requests).toHaveLength(1);

                // Act
                render(false);

                // Assert
                expect(output.textContent).toContain('An organization owner can view invoices.');
                expect(output.textContent).not.toContain('ACME-001');
                expect(output.querySelector('table')).toBeNull();
                expect(output.querySelector('a[href="https://example.com/invoices/acme"]')).toBeNull();
                expect(output.querySelector('a[href$="/api/v1/organizations/acme/invoices/in_acme/pdf"]')).toBeNull();
            }
        );
    } finally {
        release();
    }
});

it('keeps a failed invoice read inside the section and retries it successfully', async () => {
    // Arrange
    const requests: string[] = [];

    await withInvoices(
        (request) => {
            requests.push(`${request.method} ${new URL(request.url).pathname}`);
            const failed = requests.length === 1;

            return Response.json(failed ? { detail: 'Invoice provider unavailable' } : [invoice], {
                status: failed ? 503 : 200,
            });
        },
        async (output, render, errors) => {
            // Act
            render(true);

            // Assert
            await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page.'));
            expect(output.querySelector('h2')?.textContent).toBe('Invoices');
            expect(output.querySelector('table')).toBeNull();
            expect(requests).toEqual(['GET /api/v1/organizations/acme/invoices']);
            expect(errors).toEqual([
                expect.objectContaining({ name: 'ApiError', status: 503, message: 'Invoice provider unavailable' }),
            ]);

            // Act
            const retry = output.querySelector('button');
            expect(retry?.textContent).toBe('Retry');
            retry?.click();

            // Assert
            await vi.waitFor(() => expect(output.querySelector('table')?.textContent).toContain('ACME-001'));
            expect(output.querySelector('h2')?.textContent).toBe('Invoices');
            expect(output.textContent).not.toContain('Unable to load this page.');
            expect(output.querySelector('button')).toBeNull();
            expect(requests).toEqual([
                'GET /api/v1/organizations/acme/invoices',
                'GET /api/v1/organizations/acme/invoices',
            ]);
        }
    );
});
