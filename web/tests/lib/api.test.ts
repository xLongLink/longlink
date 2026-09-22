import { ApiError, api } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

// Single owner for the unusable-detail fallback message.
const FALLBACK_MESSAGE = 'The server could not complete the request. Please try again.';

/** Returns the expected mapped API error or preserves unexpected failures. */
async function apiFailure(request: PromiseLike<unknown>): Promise<ApiError> {
    try {
        await request;
    } catch (error: unknown) {
        if (error instanceof ApiError) return error;
        throw error;
    }

    throw new Error('Expected request to fail');
}

describe('api error mapping', () => {
    it('returns the server detail message with status and url', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json({ detail: 'Name too short' }, { status: 422 }))
        );

        // Act
        const failure = await apiFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure.message).toBe('Name too short');
        expect(failure.status).toBe(422);
        expect(failure.url).toBe('https://api.example/organizations');
    });

    it.each([
        { payload: { detail: '   ' }, status: 422 },
        { payload: {}, status: 500 },
        { payload: { detail: 123 }, status: 422 },
    ])('falls back when the detail is unusable: $payload', async ({ payload, status }) => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json(payload, { status }))
        );

        // Act
        const failure = await apiFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure.message).toBe(FALLBACK_MESSAGE);
        expect(failure.status).toBe(status);
    });

    it('passes network failures through without mapping', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new TypeError('Network error');
            })
        );

        // Act
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).not.toBeInstanceOf(ApiError);
        expect(failure).toBeInstanceOf(TypeError);
    });
});

describe('api success contract', () => {
    it('returns parsed JSON for a successful get', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json({ total: 3 }, { status: 200 }))
        );

        // Act
        const payload = await api.get('https://api.example/organizations').json<{ total: number }>();

        // Assert
        expect(payload).toEqual({ total: 3 });
    });

    it('sends JSON bodies with the JSON content type', async () => {
        // Arrange
        let sentBody = '';
        const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            sentBody = await request.clone().text();
            return Response.json({ id: 'acme' }, { status: 201 });
        });
        vi.stubGlobal('fetch', transport);

        // Act
        const payload = await api
            .post('https://api.example/organizations', { json: { name: 'acme' } })
            .json<{ id: string }>();

        // Assert
        expect(payload).toEqual({ id: 'acme' });
        expect(transport).toHaveBeenCalledOnce();
        const call = transport.mock.calls[0];
        if (call === undefined) throw new Error('Request was not sent');
        const [input, init] = call;
        const request = input instanceof Request ? input : new Request(input, init);
        expect(request.headers.get('content-type')).toContain('application/json');
        expect(sentBody).toContain('"acme"');
    });

    it('falls back when a failure body is not JSON', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('boom', { headers: { 'Content-Type': 'text/plain' }, status: 500 }))
        );

        // Act
        const failure = await apiFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure.message).toBe(FALLBACK_MESSAGE);
        expect(failure.status).toBe(500);
    });
});
