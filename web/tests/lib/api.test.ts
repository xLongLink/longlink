import { ApiError, api } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

function jsonResponse(payload: unknown, status: number): Response {
    // Arrange a JSON body at the HTTP transport boundary.
    return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' }, status });
}

describe('api error mapping', () => {
    it('returns the server detail message with status and url', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({ detail: 'Name too short' }, 422))
        );

        // Act
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('Name too short');
        expect((failure as ApiError).status).toBe(422);
        expect((failure as ApiError).url).toBe('https://api.example/organizations');
    });

    it('falls back when the detail is blank', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({ detail: '   ' }, 422))
        );

        // Act
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('The server could not complete the request. Please try again.');
        expect((failure as ApiError).status).toBe(422);
    });

    it('falls back when the payload has no usable detail', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({}, 500))
        );

        // Act
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('The server could not complete the request. Please try again.');
        expect((failure as ApiError).status).toBe(500);
    });

    it('falls back when the detail is not a string', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({ detail: 123 }, 422))
        );

        // Act
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('The server could not complete the request. Please try again.');
        expect((failure as ApiError).status).toBe(422);
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
            vi.fn(async () => jsonResponse({ total: 3 }, 200))
        );

        // Act
        const payload = await api.get('https://api.example/organizations').json<{ total: number }>();

        // Assert
        expect(payload).toEqual({ total: 3 });
    });

    it('sends JSON bodies with the JSON content type', async () => {
        // Arrange
        let sentBody = '';
        const transport = vi.fn(async (input: Request) => {
            sentBody = await input.clone().text();
            return jsonResponse({ id: 'acme' }, 201);
        });
        vi.stubGlobal('fetch', transport);

        // Act
        const payload = await api
            .post('https://api.example/organizations', { json: { name: 'acme' } })
            .json<{ id: string }>();

        // Assert
        expect(payload).toEqual({ id: 'acme' });
        expect(transport).toHaveBeenCalledOnce();
        const request = transport.mock.calls[0]?.[0] as Request;
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
        const failure = await api.get('https://api.example/organizations').catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('The server could not complete the request. Please try again.');
        expect((failure as ApiError).status).toBe(500);
    });
});
