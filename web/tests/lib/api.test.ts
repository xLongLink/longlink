import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/lib/api';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

function jsonResponse(payload: unknown, status: number): Response {
    // Arrange a JSON error body at the HTTP transport boundary.
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
