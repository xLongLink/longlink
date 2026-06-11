import { ApiError, fetchApiJson } from '@/lib/api';
import { afterEach, describe, expect, it } from 'bun:test';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('fetchApiJson', () => {
    /* Failed API requests should preserve the HTTP status for route-level handling. */
    it('throws ApiError with response status', async () => {
        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ detail: 'Missing organization' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404,
            })) as unknown as typeof fetch;

        await expect(fetchApiJson('/api/orgs/missing')).rejects.toMatchObject({
            message: 'Missing organization',
            status: 404,
        });
    });

    /* Malformed error responses should still expose a useful status-aware error. */
    it('falls back to status message for invalid error payloads', async () => {
        globalThis.fetch = (async () => new Response('not json', { status: 500 })) as unknown as typeof fetch;

        await expect(fetchApiJson('/api/broken')).rejects.toEqual(new ApiError('API request failed (500)', 500));
    });
});
