import { ApiError } from '@/lib/api';
import { load, requestUrl } from '@/views/host';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Restore the external HTTP boundary after each response-lifetime test.
    vi.unstubAllGlobals();
});

describe('Solution request URLs', () => {
    it('resolves bridge requests only inside the selected Solution proxy', () => {
        expect(requestUrl('/api/v1/solutions/selected/proxy/', '/api/items?page=1')).toBe(
            '/api/v1/solutions/selected/proxy/api/items?page=1'
        );
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/../users')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/%252e%252e/users')).toThrow();
    });

    it('rejects external destinations rather than granting browser navigation capabilities', () => {
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', 'https://example.com/next')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '//example.com/next')).toThrow();
    });
});

describe('Solution response limits', () => {
    it('returns every decoded byte at the limit and releases the completed reader', async () => {
        // Arrange
        const cancelled = vi.fn();

        // Serve a real chunked response with observable source cancellation.
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Split multibyte and binary data across chunks below the response limit.
                controller.enqueue(new Uint8Array([0xc3, 0xa9]));
                controller.enqueue(new Uint8Array([0, 0xff]));
                controller.close();
            },
            cancel: cancelled,
        });

        vi.stubGlobal('fetch', async () => new Response(stream, { headers: { 'Content-Length': '1' } }));

        // Act
        const body = await load('https://api.example/solution/items', { signal: new AbortController().signal }, 4);

        // Assert
        expect(new Uint8Array(await body.arrayBuffer())).toEqual(new Uint8Array([0xc3, 0xa9, 0, 0xff]));
        expect(cancelled).not.toHaveBeenCalled();
        expect(stream.locked).toBe(false);
    });

    it('rejects one decoded byte over the limit and cancels the incomplete reader', async () => {
        // Arrange
        const cancelled = vi.fn();

        // Serve an incomplete response so cancellation is observable at the source.
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Leave the response open so cancellation must reach its underlying source.
                controller.enqueue(new Uint8Array([0xc3, 0xa9]));
                controller.enqueue(new Uint8Array([0, 0xff, 1]));
            },
            cancel: cancelled,
        });

        vi.stubGlobal('fetch', async () => new Response(stream, { headers: { 'Content-Length': '1' } }));

        // Act
        const request = load('https://api.example/solution/items', { signal: new AbortController().signal }, 4);

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({ message: 'Solution response is too large', status: 413 });
        expect(cancelled).toHaveBeenCalledOnce();
        expect(stream.locked).toBe(false);
    });
});
