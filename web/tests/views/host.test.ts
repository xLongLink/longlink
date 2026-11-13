import { ApiError } from '@/lib/api';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { REQUEST_TIMEOUT } from '@/views/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, requestUrl, requestError } from '@/views/host';

afterEach(() => {
    // Restore the HTTP transport after each response-loading test.
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Solution request URLs', () => {
    it('resolves bridge requests only inside the selected Solution proxy', () => {
        // Arrange
        const path = '/api/items?page=1';

        // Act
        const url = requestUrl('/api/v1/solutions/selected/proxy/', path);

        // Assert
        expect(url).toBe('/api/v1/solutions/selected/proxy/api/items?page=1');
    });

    it.each([
        { path: '/../users', message: 'Solution request URL must remain within the solution' },
        { path: '/%252e%252e/users', message: 'Request path must remain within the Solution' },
        { path: 'https://example.com/next', message: 'Solution request URL must be solution-relative' },
        { path: '//example.com/next', message: 'Solution request URL must be solution-relative' }
    ])('rejects unsafe bridge destination $path', ({ path, message }) => {
        // Act and assert
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', path)).toThrow(message);
    });
});

describe('Solution response loading', () => {
    it('rejects redirects without requesting their destination', async () => {
        // Arrange
        let sourceRequests = 0;
        let destinationRequests = 0;
        const unexpectedRequests: string[] = [];
        const controller = new AbortController();

        const server = createServer((request, response) => {
            if (request.url === '/source') {
                sourceRequests += 1;
                response.writeHead(302, { Location: '/destination' });
                response.end();

                return;
            }

            if (request.url === '/destination') {
                destinationRequests += 1;
                response.end('Redirected content');

                return;
            }

            unexpectedRequests.push(`${request.method} ${request.url}`);
            response.writeHead(404);
            response.end();
        });

        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

        // SAFETY: TCP listen above guarantees an IP address rather than a Unix socket path.
        const address = server.address() as AddressInfo;

        // Act
        const completion = load(`http://127.0.0.1:${address.port}/source`, { signal: controller.signal }).then(
            () => ({ rejected: false, error: undefined }),
            (error: Error) => ({ rejected: true, error })
        );

        try {
            const result = await completion;

            // Assert
            expect(result.rejected).toBe(true);
            expect(result.error).toBeInstanceOf(Error);
            expect(sourceRequests).toBeGreaterThan(0);
            expect(destinationRequests).toBe(0);
            expect(unexpectedRequests).toEqual([]);
        } finally {
            controller.abort();
            server.closeAllConnections();
            await completion;
            await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        }
    });

    it.each(['caller', 'deadline'] as const)(
        'interrupts a stalled response body on $0 cancellation',
        async (source) => {
            // Arrange
            const caller = new AbortController();
            const deadline = new AbortController();

            const failure = new DOMException(
                'Response interrupted',
                source === 'deadline' ? 'TimeoutError' : 'AbortError'
            );

            const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);

            let consumeBody: ReturnType<typeof vi.spyOn> | undefined;
            let transportClosed = false;

            const fetch = globalThis.fetch;

            // Keep native fetch cancellation while observing when the response body is acquired.
            vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
                const response = await fetch(input, options);

                consumeBody = vi.spyOn(response, 'blob');

                return response;
            });

            const server = createServer((_request, response) => {
                response.once('close', () => {
                    transportClosed = true;
                });

                response.writeHead(200, { 'Content-Type': 'text/plain' });
                response.write('started');
            });

            await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

            // SAFETY: TCP listen above guarantees an IP address rather than a Unix socket path.
            const address = server.address() as AddressInfo;

            // Observe settlement without leaving an unhandled rejection on a failed assertion.
            const pending = load(`http://127.0.0.1:${address.port}/items`, { signal: caller.signal });

            let settled = false;
            let rejection: unknown;

            const completion = pending.then(
                () => {
                    settled = true;
                },
                (error: DOMException) => {
                    rejection = error;
                    settled = true;
                }
            );

            try {
                await vi.waitFor(() => expect(consumeBody).toHaveBeenCalled());

                // Act
                if (source === 'caller') caller.abort(failure);
                else deadline.abort(failure);

                // Assert
                await vi.waitFor(() => expect(settled).toBe(true));
                expect(rejection).toBe(failure);
                expect(timeout).toHaveBeenCalledWith(REQUEST_TIMEOUT);
                await vi.waitFor(() => expect(transportClosed).toBe(true));
            } finally {
                // Reap unfinished work and every server connection even when an assertion fails.
                caller.abort(failure);
                deadline.abort(failure);
                server.closeAllConnections();
                await completion;
                await new Promise<void>((resolve, reject) =>
                    server.close((error) => (error ? reject(error) : resolve()))
                );
            }
        }
    );

    it.each([
        { name: 'missing Content-Length', headers: new Headers() },
        { name: 'underreported Content-Length', headers: new Headers({ 'Content-Length': '1' }) }
    ])('accepts a complete response with $name', async ({ headers }) => {
        // Arrange
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('ab'));
                controller.enqueue(new TextEncoder().encode('cde'));
                controller.close();
            }
        });

        vi.stubGlobal('fetch', async () => new Response(body, { headers }));
        const controller = new AbortController();

        // Act
        const response = await load('https://solution.example/items', { signal: controller.signal });

        // Assert
        expect(await response.text()).toBe('abcde');
        expect(response.size).toBe(5);
    });
});

describe('Solution request errors', () => {
    // Arrange
    it.each([
        {
            name: 'server diagnostics',
            cause: new ApiError('Database password: server-secret', 500, 'https://internal.example/items'),
            expected: { error: 'The server could not complete the request. Please try again.', status: 500 }
        },
        {
            name: 'network diagnostics',
            cause: new TypeError('Fetch failed at https://internal.example/items?token=transport-secret'),
            expected: { error: 'Solution request failed. Please try again.' }
        }
    ])('redacts $name before replying to the sandbox', ({ cause, expected }) => {
        // Act
        const failure = requestError(cause);

        // Assert
        expect(failure).toEqual(expected);
    });

    it('preserves bounded client feedback without exposing transport metadata', () => {
        // Arrange
        const feedback = 'x'.repeat(1024);
        const cause = new ApiError(`${feedback}overflow`, 422, 'https://internal.example/items?token=transport-secret');

        // Act
        const failure = requestError(cause);

        // Assert
        expect(failure).toEqual({ error: feedback, status: 422 });
    });
});
