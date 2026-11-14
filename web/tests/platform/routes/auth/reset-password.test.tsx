// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import Page from '@/platform/routes/auth/reset-password';

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

it.each([204, 400])('handles password reset submission status %s after valid admission', async (status) => {
    // Arrange an accepted setup whose credential may expire before submission.
    const passwords: unknown[] = [];
    const errors: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'GET' && path === '/api/v1/auth/reset-password/setup') {
            return new Response(null, { status: 204 });
        }

        if (request.method === 'POST' && path === '/api/v1/auth/reset-password') {
            passwords.push(await request.json());

            return status === 204
                ? new Response(null, { status })
                : Response.json({ detail: 'Expired setup' }, { status });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <ApiBoundary>
                    <Page />
                </ApiBoundary>
            </ApiErrorContext>,
            async (output) => {
                const announcements: string[] = [];

                const observer = new MutationObserver(() => {
                    const text = output.querySelector('.native-auth-banner [role="status"]')?.textContent;

                    if (text && announcements.at(-1) !== text) announcements.push(text);
                });

                observer.observe(output, { childList: true, subtree: true, characterData: true });
                await act(async () => {
                    await vi.waitFor(() => expect(output.querySelector('input[type="password"]')).not.toBeNull());
                });
                const password = output.querySelector<HTMLInputElement>('input[type="password"]');
                const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');
                const events = userEvent.setup();

                if (!password || !submit) throw new Error('Expected admitted password form');

                // Submit real valid credentials through React Hook Form.
                await act(async () => {
                    await events.type(password, 'Strong-password-123');
                    await events.click(submit);
                });

                // Rejected credentials must never expose the success state.
                await act(async () => {
                    await vi.waitFor(() =>
                        expect(
                            output.querySelector(
                                status === 204 ? 'a[href="/login"]' : 'a[href="/auth/forgot-password"]'
                            )
                        ).not.toBeNull()
                    );
                });
                expect(passwords).toEqual([{ password: 'Strong-password-123' }]);
                expect(output.querySelector('input[type="password"]')).toBeNull();
                expect(output.textContent?.includes('Your password has been reset.')).toBe(status === 204);
                expect(output.querySelector('a[href="/login"]') !== null).toBe(status === 204);
                expect(errors).toEqual([]);

                if (status === 204) {
                    await vi.waitFor(() =>
                        expect(announcements).toEqual(['Your password has been reset. You can now sign in.'])
                    );
                    expect(
                        output.querySelectorAll('.native-auth-banner [role="status"], .native-auth-banner [aria-live]')
                    ).toHaveLength(1);
                } else {
                    expect(announcements).toEqual([]);
                }

                observer.disconnect();
            },
            '/auth/reset-password'
        );
    } finally {
        transport.mockRestore();
    }
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
                    'POST /api/v1/auth/reset-password/verify'
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
