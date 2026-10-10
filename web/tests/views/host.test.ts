import { ApiError } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, requestUrl, requestError } from '@/views/host';

afterEach(() => {
    // Restore the HTTP transport after each response-loading test.
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
    it('accepts a multi-chunk response exactly at the byte limit and releases its reader', async () => {
        // Arrange
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('ab'));
                controller.enqueue(new TextEncoder().encode('cd'));
                controller.close();
            },
        });

        vi.stubGlobal('fetch', async () => new Response(body));
        const controller = new AbortController();

        // Act
        const response = await load('https://solution.example/items', { signal: controller.signal }, 4);

        // Assert
        expect(await response.text()).toBe('abcd');
        expect(response.size).toBe(4);
        expect(body.locked).toBe(false);
    });

    it.each([
        { name: 'missing Content-Length', headers: new Headers() },
        { name: 'underreported Content-Length', headers: new Headers({ 'Content-Length': '1' }) },
    ])('rejects cumulative overflow with $name and cancels its stream', async ({ headers }) => {
        // Arrange
        const cancel = vi.fn();

        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('ab'));
                controller.enqueue(new TextEncoder().encode('cde'));
            },
            cancel,
        });

        vi.stubGlobal('fetch', async () => new Response(body, { headers }));
        const controller = new AbortController();

        // Act
        const response = load('https://solution.example/items', { signal: controller.signal }, 4);

        // Assert
        await expect(response).rejects.toBeInstanceOf(ApiError);
        await expect(response).rejects.toMatchObject({ message: 'Solution response is too large', status: 413 });
        expect(cancel).toHaveBeenCalledOnce();
        expect(body.locked).toBe(false);
    });
});

describe('Solution request errors', () => {
    // Arrange
    it.each([
        {
            name: 'server diagnostics',
            cause: new ApiError('Database password: server-secret', 500, 'https://internal.example/items'),
            expected: { error: 'The server could not complete the request. Please try again.', status: 500 },
        },
        {
            name: 'network diagnostics',
            cause: new TypeError('Fetch failed at https://internal.example/items?token=transport-secret'),
            expected: { error: 'Solution request failed. Please try again.' },
        },
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
