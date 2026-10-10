import { ApiError, api } from '@/lib/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    // Arrange isolation for the global transport boundary.
    vi.unstubAllGlobals();
});

describe('api error mapping', () => {
    it.each([
        {
            name: 'returns the server detail message with status and url',
            detail: 'Name too short',
            message: 'Name too short',
        },
        {
            name: 'reports validation locations and messages without submitted values or error context',
            detail: [
                {
                    loc: ['body', 'envs', 'API_KEY'],
                    msg: 'Invalid API key',
                    input: 'submitted-secret',
                    ctx: { error: 'sensitive internal diagnostic' },
                },
            ],
            message: 'envs.API_KEY: Invalid API key',
        },
    ])('$name', async ({ detail, message }) => {
        // Arrange
        vi.stubGlobal('fetch', async () => Response.json({ detail }, { status: 422 }));

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({
            message,
            status: 422,
            url: 'https://api.example/organizations',
        });
    });

    it.each([
        { name: 'blank detail', response: () => Response.json({ detail: '   ' }, { status: 422 }) },
        { name: 'missing detail', response: () => Response.json({}, { status: 500 }) },
        { name: 'non-string detail', response: () => Response.json({ detail: 123 }, { status: 422 }) },
        {
            name: 'non-JSON body',
            response: () => new Response('boom', { headers: { 'Content-Type': 'text/plain' }, status: 500 }),
        },
    ])('falls back for a $name', async ({ response }) => {
        // Arrange
        const serverResponse = response();
        vi.stubGlobal('fetch', async () => serverResponse);

        // Act
        const request = api.get('https://api.example/organizations');

        // Assert
        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({
            message: 'The server could not complete the request. Please try again.',
            status: serverResponse.status,
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
