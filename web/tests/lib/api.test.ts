import {
    ApiError,
    apiUrl,
    createApiHeaders,
    fetchApiJson,
    fetchApiResponse,
    fetchApiText,
    fetchApiVoid,
} from '@/lib/api';
import { SDK_USER_STORAGE_KEY } from '@/lib/sdk-users';
import { afterEach, describe, expect, it } from 'bun:test';

const originalFetch = globalThis.fetch;
const originalMode = import.meta.env.MODE;
const originalApiUrl = import.meta.env.VITE_API_URL;
const originalWindow = globalThis.window;

afterEach(() => {
    globalThis.fetch = originalFetch;
    import.meta.env.MODE = originalMode;
    import.meta.env.VITE_API_URL = originalApiUrl;
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
    });
});

describe('apiUrl', () => {
    /* API mode may point at a separate API origin during local frontend development. */
    it('prefixes API paths with VITE_API_URL when configured', () => {
        import.meta.env.VITE_API_URL = 'https://api.example.test/base/';

        expect(apiUrl('/api/healthz')).toBe('https://api.example.test/api/healthz');
    });

    it('allows absolute HTTP gateway URLs', () => {
        expect(apiUrl('https://apps.example.test/api/applications/app/proxy/metadata.json')).toBe(
            'https://apps.example.test/api/applications/app/proxy/metadata.json'
        );
        expect(() => apiUrl('mailto:help@example.test')).toThrow('API URL must use HTTP(S)');
        expect(() => apiUrl('https://apps.example.test\\evil')).toThrow('API path must not contain backslashes');
    });
});

describe('createApiHeaders', () => {
    /* SDK mode forwards the deterministic local user id for runtime audit attribution. */
    it('adds the stored SDK user header when one is not already present', () => {
        import.meta.env.MODE = 'sdk';
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: {
                localStorage: {
                    getItem: (key: string) =>
                        key === SDK_USER_STORAGE_KEY ? '00000000-0000-0000-0000-000000000004' : null,
                    setItem: () => undefined,
                },
            },
        });

        expect(createApiHeaders().get('x-user-id')).toBe('00000000-0000-0000-0000-000000000004');
        expect(createApiHeaders({ 'x-user-id': '00000000-0000-0000-0000-000000000002' }).get('x-user-id')).toBe(
            '00000000-0000-0000-0000-000000000002'
        );
    });
});

describe('fetchApiResponse', () => {
    /* All API requests include credentials and default JSON accept headers. */
    it('normalizes credentials and accept headers', async () => {
        let capturedInput: unknown = null;
        let capturedInit: RequestInit | undefined;

        await fetchApiResponse('/api/healthz', undefined, (async (input, init) => {
            capturedInput = input;
            capturedInit = init;
            return new Response('{}');
        }) as typeof fetch);

        expect(capturedInput).toBe('/api/healthz');
        expect(capturedInit?.credentials).toBe('include');
        expect(new Headers(capturedInit?.headers).get('Accept')).toBe('application/json');
    });
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

describe('fetchApiText', () => {
    it('returns response text for successful requests', async () => {
        globalThis.fetch = (async () => new Response('plain logs')) as unknown as typeof fetch;

        await expect(fetchApiText('/api/applications/app-1/logs')).resolves.toBe('plain logs');
    });
});

describe('fetchApiVoid', () => {
    it('accepts empty successful responses', async () => {
        globalThis.fetch = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

        await expect(fetchApiVoid('/api/empty')).resolves.toBeUndefined();
    });
});
