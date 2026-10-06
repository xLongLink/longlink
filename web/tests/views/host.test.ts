import { NetworkError } from 'ky';
import { once } from 'node:events';
import { load } from '@/views/host';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Restore the external HTTP transport after every test.
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('bounded Solution responses', () => {
    it.each([
        { media: 'image/png', type: 'image/png' },
        { media: 'image/jpeg', type: 'image/jpeg' },
        { media: 'image/gif', type: 'image/gif' },
        { media: 'image/webp', type: 'image/webp' },
        { media: 'audio/mpeg', type: 'audio/mpeg' },
        { media: 'audio/ogg', type: 'audio/ogg' },
        { media: 'video/mp4', type: 'video/mp4' },
        { media: 'application/pdf', type: 'application/pdf' },
        { media: 'image/png; charset=utf-8', type: 'image/png' },
        { media: 'image/svg+xml', type: 'application/octet-stream' },
        { media: 'text/html', type: 'application/octet-stream' },
        { media: undefined, type: 'application/octet-stream' },
    ])('normalizes $media to $type without changing binary bytes', async ({ media, type }) => {
        // Arrange
        const bytes = new Uint8Array([0, 1, 127, 128, 255]);
        const headers = new Headers();
        if (media !== undefined) headers.set('Content-Type', media);
        vi.stubGlobal('fetch', async () => new Response(bytes, { headers }));

        // Act
        const body = await load('https://solution.example/media', { signal: new AbortController().signal });

        // Assert
        expect(body.type).toBe(type);
        expect(new Uint8Array(await body.arrayBuffer())).toEqual(bytes);
    });

    it('accepts streamed bytes exactly at the limit and releases the reader', async () => {
        // Arrange
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('ab'));
                controller.enqueue(new TextEncoder().encode('cd'));
                controller.close();
            },
        });
        vi.stubGlobal('fetch', async () => new Response(stream));

        // Act
        const body = await load('https://solution.example/items', { signal: new AbortController().signal }, 4);

        // Assert
        expect(await body.text()).toBe('abcd');
        expect(stream.locked).toBe(false);
    });

    it('rejects one byte over the decoded limit and cancels the incomplete stream', async () => {
        // Arrange
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('ab'));
                controller.enqueue(new TextEncoder().encode('cde'));
            },
            cancel() {
                cancelled = true;
            },
        });
        vi.stubGlobal('fetch', async () => new Response(stream, { headers: { 'Content-Length': '4' } }));

        // Act
        const request = load('https://solution.example/items', { signal: new AbortController().signal }, 4);

        // Assert
        await expect(request).rejects.toThrow('Solution response is too large');
        expect(cancelled).toBe(true);
        expect(stream.locked).toBe(false);
    });

    it('rejects HTTP redirects without requesting the destination', async () => {
        // Arrange
        let sourceRequests = 0;
        let destinationRequests = 0;
        const server = createServer((request, response) => {
            // Provide a reachable redirect target that would succeed if redirects were followed.
            if (request.url === '/items') {
                sourceRequests += 1;
                response.writeHead(302, { Location: '/outside-solution' });
                response.end();
                return;
            }
            destinationRequests += 1;
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end('{"private":"outside the Solution"}');
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');

        try {
            // Resolve the disposable server rather than relying on a fixed port.
            const address = server.address();
            if (!address || typeof address === 'string') throw new Error('Missing local HTTP address');

            // Act
            const request = load(`http://127.0.0.1:${address.port}/items`, { signal: AbortSignal.timeout(2_000) });

            // Assert
            await expect(request).rejects.toBeInstanceOf(NetworkError);
            expect(sourceRequests).toBe(1);
            expect(destinationRequests).toBe(0);
        } finally {
            // Close every connection and release the local listening socket after success or failure.
            server.closeAllConnections();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    it('aborts a response stalled after headers and releases its reader and connection', async () => {
        // Arrange
        let connectionClosed = false;
        const server = createServer((_request, response) => {
            response.once('close', () => {
                connectionClosed = true;
            });
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write('{"partial":');
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const controller = new AbortController();
        let request: Promise<void> | undefined;

        try {
            // Shorten only the clock boundary while retaining real timeout cancellation and HTTP transport.
            const timeout = AbortSignal.timeout;
            let deadline: AbortSignal | undefined;
            vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
                deadline = timeout(1_000);
                return deadline;
            });
            const fetchRequest = globalThis.fetch;
            let responseBody: ReadableStream<Uint8Array> | null | undefined;
            vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
                const response = await fetchRequest(input, init);
                responseBody = response.body;
                return response;
            });
            const address = server.address();
            if (!address || typeof address === 'string') throw new Error('Missing local HTTP address');
            let outcome: unknown;

            // Act
            request = load(`http://127.0.0.1:${address.port}/items`, { signal: controller.signal }).then(
                (body) => {
                    outcome = body;
                },
                (error: unknown) => {
                    outcome = error;
                }
            );

            // Assert
            await vi.waitFor(() => expect(outcome).toMatchObject({ name: 'TimeoutError' }), { timeout: 2_500 });
            expect(deadline?.aborted).toBe(true);
            expect(outcome).toBe(deadline?.reason);
            expect(responseBody?.locked).toBe(false);
            await vi.waitFor(() => expect(connectionClosed).toBe(true));
        } finally {
            // Terminate stalled work even when a regression prevents the timeout from interrupting it.
            controller.abort();
            server.closeAllConnections();
            await request;
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
