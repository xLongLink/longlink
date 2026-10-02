import { ApiError, api } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

// Single owner for the unusable-detail fallback message.
const FALLBACK_MESSAGE = 'The server could not complete the request. Please try again.';

/** Stub the fetch transport with a JSON response. */
function stubJsonFetch(payload: unknown, status: number): void {
    vi.stubGlobal('fetch', async () => Response.json(payload, { status }));
}

describe('api error mapping', () => {
    it('returns the server detail message with status and url', async () => {
        // Arrange
        stubJsonFetch({ detail: 'Name too short' }, 422);

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({
            message: 'Name too short',
            status: 422,
            url: 'https://api.example/organizations',
        });
    });

    it.each([
        { payload: { detail: '   ' }, status: 422 },
        { payload: {}, status: 500 },
        { payload: { detail: 123 }, status: 422 },
    ])('falls back when the detail is unusable: $payload', async ({ payload, status }) => {
        // Arrange
        stubJsonFetch(payload, status);

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({ message: FALLBACK_MESSAGE, status });
    });

    it('passes network failures through without mapping', async () => {
        // Arrange
        const networkError = new TypeError('Network error');
        vi.stubGlobal('fetch', async () => {
            throw networkError;
        });

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBe(networkError);
    });

    it('falls back when a failure body is not JSON', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            async () => new Response('boom', { headers: { 'Content-Type': 'text/plain' }, status: 500 })
        );

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({ message: FALLBACK_MESSAGE, status: 500 });
    });
});
