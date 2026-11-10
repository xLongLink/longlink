// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import Brand from '@/platform/layouts/Brand';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import Page from '@/platform/routes/auth/VerifyEmail';
import { ApiBoundary } from '@/components/ApiBoundary';

it('allows account credential entry only after the email proof exchange succeeds', async () => {
    // Arrange
    const storageKey = 'longlink.registration.token';
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const requests: Request[] = [];
    const errors: unknown[] = [];
    let resolveVerification: (response: Response) => void = () => undefined;

    const verificationResponse = new Promise<Response>((resolve) => {
        resolveVerification = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        requests.push(request);

        if (request.method === 'POST' && new URL(request.url).pathname === '/api/v1/auth/verify') {
            return verificationResponse;
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <Brand>
                    <ApiBoundary>
                        <Page />
                    </ApiBoundary>
                </Brand>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(await requests[0]?.clone().json()).toEqual({ token: 'registration-proof' });
                expect(sessionStorage.getItem(storageKey)).toBe('registration-proof');
                expect(output.querySelector('input[name="password"]')).toBeNull();
                expect(output.querySelector('input[name="name"]')).toBeNull();
                expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
                    'noindex, nofollow'
                );

                // Act
                await act(async () => resolveVerification(Response.json({ email: 'new@example.com' })));

                // Assert
                await vi.waitFor(() => expect(output.querySelector('input[name="name"]')).not.toBeNull());
                expect(output.querySelector('input[name="password"]')).not.toBeNull();
                expect(output.querySelector('button[type="submit"]')?.textContent).toBe('Create account');
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'POST /api/v1/auth/verify',
                ]);
                expect(errors).toEqual([]);
            },
            '/auth/verify-email#token=registration-proof'
        );
    } finally {
        resolveVerification(Response.json({ email: 'new@example.com' }));
        transport.mockRestore();
        window.history.replaceState(originalState, '', originalUrl);
        sessionStorage.removeItem(storageKey);
    }
});

it('withholds account credentials and offers a new link when email proof is rejected', async () => {
    // Arrange
    const storageKey = 'longlink.registration.token';
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const requests: Request[] = [];
    const errors: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        requests.push(request);

        if (request.method === 'POST' && new URL(request.url).pathname === '/api/v1/auth/verify') {
            return Response.json({ detail: 'Invalid registration token' }, { status: 400 });
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <Brand>
                    <ApiBoundary>
                        <Page />
                    </ApiBoundary>
                </Brand>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('a[href="/auth/register"]')?.textContent).toBe(
                        'Request a new registration link'
                    )
                );
                expect(output.querySelector('input[name="password"]')).toBeNull();
                expect(output.querySelector('input[name="name"]')).toBeNull();
                expect(sessionStorage.getItem(storageKey)).toBeNull();
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'POST /api/v1/auth/verify',
                ]);
                expect(await requests[0]?.clone().json()).toEqual({ token: 'rejected-registration-proof' });
                expect(errors).toEqual([]);
            },
            '/auth/verify-email#token=rejected-registration-proof'
        );
    } finally {
        transport.mockRestore();
        window.history.replaceState(originalState, '', originalUrl);
        sessionStorage.removeItem(storageKey);
    }
});
