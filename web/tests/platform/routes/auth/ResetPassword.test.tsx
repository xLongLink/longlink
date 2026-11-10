// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import { ApiErrorContext } from '@/lib/errors';
import { ApiBoundary } from '@/components/ApiBoundary';
import Page from '@/platform/routes/auth/ResetPassword';

it('does not expose password editing before reset proof has been verified', () => {
    // Act
    const output = renderPlatform(
        <ApiBoundary>
            <Page />
        </ApiBoundary>,
        '/auth/reset-password'
    );

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Set a new password');
    expect(output.querySelector('input[type="password"]')).toBeNull();
});

it('allows password editing only after the reset token exchange succeeds', async () => {
    // Arrange
    const storageKey = 'longlink.password-reset.token';
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

        if (request.method === 'POST' && new URL(request.url).pathname === '/api/v1/auth/reset-password/verify') {
            return verificationResponse;
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <ApiBoundary>
                    <Page />
                </ApiBoundary>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'POST /api/v1/auth/reset-password/verify',
                ]);
                expect(await requests[0]?.clone().json()).toEqual({ token: 'reset-proof' });
                expect(sessionStorage.getItem(storageKey)).toBe('reset-proof');
                expect(output.querySelector('input[type="password"]')).toBeNull();

                // Act
                await act(async () => resolveVerification(new Response(null, { status: 204 })));

                // Assert
                await vi.waitFor(() => expect(output.querySelector('input[type="password"]')).not.toBeNull());
                expect(sessionStorage.getItem(storageKey)).toBeNull();
                expect(requests).toHaveLength(1);
                expect(errors).toEqual([]);
            },
            '/auth/reset-password#token=reset-proof'
        );
    } finally {
        resolveVerification(new Response(null, { status: 204 }));
        transport.mockRestore();
        window.history.replaceState(originalState, '', originalUrl);
        sessionStorage.removeItem(storageKey);
    }
});
