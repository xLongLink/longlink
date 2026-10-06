import { ApiError, api } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

describe('api error mapping', () => {
    it('returns the server detail message with status and url', async () => {
        // Arrange
        vi.stubGlobal('fetch', async () => Response.json({ detail: 'Name too short' }, { status: 422 }));

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
        { name: 'blank detail', response: () => Response.json({ detail: '   ' }, { status: 422 }), status: 422 },
        { name: 'missing detail', response: () => Response.json({}, { status: 500 }), status: 500 },
        { name: 'non-string detail', response: () => Response.json({ detail: 123 }, { status: 422 }), status: 422 },
        {
            name: 'non-JSON body',
            response: () => new Response('boom', { headers: { 'Content-Type': 'text/plain' }, status: 500 }),
            status: 500,
        },
    ])('falls back for a $name', async ({ response, status }) => {
        // Arrange
        vi.stubGlobal('fetch', async () => response());

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({
            message: 'The server could not complete the request. Please try again.',
            status,
        });
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
});
