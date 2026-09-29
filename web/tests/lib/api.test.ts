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
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(payload, { status }))
    );
}

/** Capture a rejected API promise as a value for assertions. */
async function captureFailure(promise: Promise<unknown>): Promise<unknown> {
    return promise.catch((error: unknown) => error);
}

describe('api error mapping', () => {
    it('returns the server detail message with status and url', async () => {
        // Arrange
        stubJsonFetch({ detail: 'Name too short' }, 422);

        // Act
        const failure = await captureFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe('Name too short');
        expect((failure as ApiError).status).toBe(422);
        expect((failure as ApiError).url).toBe('https://api.example/organizations');
    });

    it.each([
        { payload: { detail: '   ' }, status: 422 },
        { payload: {}, status: 500 },
        { payload: { detail: 123 }, status: 422 },
    ])('falls back when the detail is unusable: $payload', async ({ payload, status }) => {
        // Arrange
        stubJsonFetch(payload, status);

        // Act
        const failure = await captureFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe(FALLBACK_MESSAGE);
        expect((failure as ApiError).status).toBe(status);
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
        const failure = await captureFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure).toBeInstanceOf(TypeError);
    });

    it('falls back when a failure body is not JSON', async () => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('boom', { headers: { 'Content-Type': 'text/plain' }, status: 500 }))
        );

        // Act
        const failure = await captureFailure(api.get('https://api.example/organizations'));

        // Assert
        expect(failure).toBeInstanceOf(ApiError);
        expect((failure as ApiError).message).toBe(FALLBACK_MESSAGE);
        expect((failure as ApiError).status).toBe(500);
    });
});
