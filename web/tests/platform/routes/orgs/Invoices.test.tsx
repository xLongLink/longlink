// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { flushSync } from 'react-dom';
import { it, vi, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { ApiErrorContext } from '@/lib/errors';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import Invoices from '@/platform/routes/orgs/Invoices';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { createServer, type RequestListener } from 'node:http';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const invoice = {
    id: 'in_acme',
    total: 1200,
    number: 'ACME-001',
    status: 'paid',
    currency: 'usd',
    created_at: '2026-10-01T00:00:00Z',
    invoice_pdf: 'https://example.com/invoices/acme.pdf',
    hosted_invoice_url: 'https://example.com/invoices/acme',
};

/** Mounts the section with real providers and an isolated HTTP API boundary. */
async function withInvoices(
    respond: RequestListener,
    check: (output: HTMLElement, render: (canManage: boolean) => void, errors: unknown[]) => Promise<void>
) {
    const server = createServer((request, response) => {
        response.setHeader('Access-Control-Allow-Origin', 'http://localhost');
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
        response.setHeader('Access-Control-Allow-Methods', 'GET');

        // Let the DOM HTTP client complete its local cross-origin preflight.
        if (request.method === 'OPTIONS') {
            response.writeHead(204);
            response.end();

            return;
        }

        respond(request, response);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    // SAFETY: Listening on a TCP port guarantees an IP address rather than a Unix socket.
    const address = server.address() as AddressInfo;

    const base = `http://127.0.0.1:${address.port}/api/v1/organizations/acme`;
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
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
}

it('does not request private invoices until the section is owner-accessible, then shows its loading state', async () => {
    // Arrange
    const requests: string[] = [];
    let release: () => void = () => undefined;

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    await withInvoices(
        (request, response) => {
            requests.push(`${request.method} ${request.url}`);
            void pending.then(() => {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify([invoice]));
            });
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
        }
    );
});

it('keeps a failed invoice read inside the section and retries it successfully', async () => {
    // Arrange
    const requests: string[] = [];

    await withInvoices(
        (request, response) => {
            requests.push(`${request.method} ${request.url}`);
            const failed = requests.length === 1;
            response.writeHead(failed ? 503 : 200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(failed ? { detail: 'Invoice provider unavailable' } : [invoice]));
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
