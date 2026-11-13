// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import { renderPlatform, user } from '../render';
import Layout from '@/platform/layouts/Authenticated';
import { ApiProvider } from '@/components/ApiProvider';
import { AccountAppearanceProvider } from '@/components/Appearance';

it('does not mount protected content while the identity request is unresolved', () => {
    // Act
    const output = renderPlatform(<Layout />, '/user/organizations');

    // Assert
    expect(output.textContent).toContain('Loading account');
    expect(output.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
});

it.each([401, 503])(
    'handles an identity refresh failure (%s) without retaining protected content or losing recovery',
    async (status) => {
        // Arrange a valid session before a cross-tab refresh fails.
        let failure: number | undefined;
        let recovery: Promise<Response> | undefined;
        let requests = 0;

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);

            if (new URL(request.url).pathname !== '/api/v1/me') throw new Error(`Unexpected request: ${request.url}`);

            requests += 1;

            if (recovery) return await recovery;

            return failure
                ? Response.json({ detail: 'Identity unavailable' }, { status: failure })
                : Response.json(user);
        });

        try {
            await withMounted(
                <ApiProvider>
                    <AccountAppearanceProvider>
                        <Routes>
                            <Route element={<Layout />}>
                                <Route path="/user/organizations" element={<p>Private organizations</p>} />
                            </Route>
                            <Route path="/login" element={<p>Sign in again</p>} />
                        </Routes>
                    </AccountAppearanceProvider>
                </ApiProvider>,
                async (output) => {
                    await act(async () => {
                        await vi.waitFor(() => expect(output.textContent).toContain('Private organizations'));
                    });

                    // Revalidate through the provider's real cross-tab subscription.
                    await act(async () => {
                        failure = status;
                        window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
                    });

                    // Distinguish session loss from a recoverable API failure.
                    await vi.waitFor(async () => {
                        await act(async () => {});
                        expect(output.textContent).toContain(
                            status === 401 ? 'Sign in again' : 'Unable to load your account.'
                        );
                    });
                    expect(output.textContent).not.toContain('Private organizations');

                    if (status === 401) {
                        expect(localStorage.getItem('longlink:appearance')).toBeNull();
                    } else {
                        expect(localStorage.getItem('longlink:appearance')).toBe(
                            JSON.stringify({ theme: user.theme, accent: user.accent })
                        );

                        const retry = Array.from(output.querySelectorAll('button')).find(
                            (button) => button.textContent === 'Retry'
                        );

                        if (!retry) throw new Error('Expected account recovery');

                        // Keep duplicate retries from restarting a pending identity request.
                        const previousRequests = requests;
                        let completeRecovery: ((response: Response) => void) | undefined;
                        recovery = new Promise<Response>((resolve) => {
                            completeRecovery = resolve;
                        });

                        await act(async () => {
                            failure = undefined;
                            retry.click();
                            retry.click();
                        });
                        await vi.waitFor(async () => {
                            await act(async () => {});
                            expect(requests).toBe(previousRequests + 1);
                            expect(retry.getAttribute('aria-busy')).toBe('true');
                        });
                        expect(output.textContent).not.toContain('Private organizations');
                        expect(output.textContent).not.toContain('Sign in again');

                        // Retry the same observer without returning to the sign-in form.
                        const resolveRecovery = completeRecovery;

                        if (!resolveRecovery) throw new Error('Expected pending account recovery');

                        await act(async () => {
                            resolveRecovery(Response.json(user));
                            await vi.waitFor(() => expect(output.textContent).toContain('Private organizations'));
                        });
                        expect(requests).toBe(previousRequests + 1);
                    }
                },
                '/user/organizations'
            );
        } finally {
            transport.mockRestore();
            localStorage.removeItem('longlink:appearance');
        }
    }
);
