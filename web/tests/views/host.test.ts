import { Window } from 'happy-dom';
import { ApiError } from '@/lib/api';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { REQUEST_TIMEOUT } from '@/views/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { download, load, request, requestError } from '@/views/host';

afterEach(() => {
    // Restore the HTTP transport after each response-loading test.
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Solution response loading', () => {
    it.each([
        { media: 'IMAGE/PNG; charset=binary', expected: 'image/png' },
        { media: 'audio/ogg', expected: 'audio/ogg' },
        { media: 'video/mp4', expected: 'video/mp4' },
        { media: 'application/xml', expected: 'application/xml' },
        { media: 'image/svg+xml', expected: 'image/svg+xml' },
        { media: 'IMAGE/SVG+XML; charset=utf-8', expected: 'image/svg+xml' },
        { media: 'image/svg', expected: 'application/octet-stream' }
    ])('admits $media as $expected without changing attachment bytes', async ({ media, expected }) => {
        // Arrange
        const bytes = new Uint8Array([0x00, 0xff, 0x3c, 0x3e]);
        vi.spyOn(globalThis, 'fetch').mockImplementation(
            async () => new Response(bytes, { headers: { 'Content-Type': media } })
        );
        const controller = new AbortController();

        // Act
        const body = await request(
            'https://solution.example/',
            { type: 'request', id: 0, path: 'attachment.png', method: 'GET', binary: true },
            controller.signal
        );

        // Assert
        if (!(body instanceof Blob)) throw new Error('Expected binary response');
        expect(body.type).toBe(expected);
        expect(new Uint8Array(await body.arrayBuffer())).toEqual(bytes);
    });

    it('downloads SVG as inert attachment bytes and releases its link and URL', async () => {
        // Arrange
        const window = new Window();
        vi.stubGlobal('document', window.document);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>active()</script></svg>';
        vi.spyOn(globalThis, 'fetch').mockImplementation(
            async () => new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
        );
        const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        const click = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function (
            this: HTMLAnchorElement
        ) {
            expect(this.isConnected).toBe(true);
            expect(this.href).toBe('blob:download');
            expect(this.download).toBe('attachment.svg');
        });

        try {
            // Act
            await download(
                'https://solution.example/',
                { type: 'download', id: 0, path: 'attachment.svg', filename: 'attachment.svg' },
                new AbortController().signal
            );

            // Assert
            expect(click).toHaveBeenCalledTimes(1);
            expect(create).toHaveBeenCalledTimes(1);
            const body = create.mock.calls[0]?.[0];
            if (!(body instanceof Blob)) throw new Error('Expected download blob');
            expect(body.type).toBe('application/octet-stream');
            expect(await body.text()).toBe(svg);
            expect(window.document.querySelector('a, svg, script, iframe, object, embed')).toBeNull();
            await vi.waitFor(() => expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:download'));
        } finally {
            await window.happyDOM.close();
        }
    });

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
            const pending = (async () => {
                const response = await load(`http://127.0.0.1:${address.port}/items`, { signal: caller.signal });
                return await response.blob();
            })();

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
