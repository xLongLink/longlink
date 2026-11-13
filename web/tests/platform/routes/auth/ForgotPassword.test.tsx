// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';
import Page from '@/platform/routes/auth/ForgotPassword';

it('requests an email before displaying password-reset confirmation', () => {
    // Act
    const output = renderPlatform(<Page />);

    // Assert
    expect(output.querySelector('input[name="email"]')?.getAttribute('type')).toBe('email');
    expect(output.textContent).toContain('Send reset email');
    expect(output.textContent).not.toContain('instructions are on the way');
});

it.each([204, 503])('only confirms a reset email after a successful response, status %s', async (status) => {
    const payloads: unknown[] = [];
    const errors: unknown[] = [];
    let completeRequest: (response: Response) => void = () => undefined;

    const response = new Promise<Response>((resolve) => {
        completeRequest = resolve;
    });

    // Keep the real submission pending to distinguish a confirmed request from an optimistic banner.
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/v1/auth/forgot-password') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        payloads.push(await request.json());

        return response;
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
                const email = output.querySelector<HTMLInputElement>('input[name="email"]');
                const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');
                const user = userEvent.setup();

                if (!email || !submit) throw new Error('Missing password-reset request form');

                await act(async () => {
                    await user.type(email, 'unknown@example.com');
                    await user.click(submit);
                });
                expect(payloads).toEqual([{ email: 'unknown@example.com' }]);
                expect(output.textContent).not.toContain('instructions are on the way');

                // Only an accepted request may replace the form with the account-neutral confirmation.
                await act(async () =>
                    completeRequest(
                        status === 204
                            ? new Response(null, { status })
                            : Response.json({ detail: 'Email service unavailable' }, { status })
                    )
                );
                await act(async () => {
                    await vi.waitFor(() =>
                        expect(
                            status === 204
                                ? output.textContent?.includes('instructions are on the way')
                                : output.textContent?.includes('Unable to load this page.')
                        ).toBe(true)
                    );
                });

                expect(output.textContent?.includes('instructions are on the way')).toBe(status === 204);
                expect(output.textContent?.includes('If an account exists for that email')).toBe(status === 204);
                expect(errors).toHaveLength(status === 204 ? 0 : 1);

                if (status === 204) {
                    await vi.waitFor(() =>
                        expect(announcements).toEqual([
                            'If an account exists for that email, password reset instructions are on the way.'
                        ])
                    );
                    expect(
                        output.querySelectorAll('.native-auth-banner [role="status"], .native-auth-banner [aria-live]')
                    ).toHaveLength(1);
                } else {
                    expect(announcements).toEqual([]);
                }

                observer.disconnect();
            },
            '/auth/forgot-password'
        );
    } finally {
        completeRequest(new Response(null, { status: 204 }));
        transport.mockRestore();
    }
});
