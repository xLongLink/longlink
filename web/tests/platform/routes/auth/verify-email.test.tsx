// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { user } from '../../render';
import { it, expect, vi } from 'vitest';
import PlatformRoot from '@/platform/root';
import Brand from '@/platform/layouts/brand';
import { Route, Routes } from 'react-router';
import { withMounted } from '../../../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import { AccountProvider } from '@/platform/account';
import Page from '@/platform/routes/auth/verify-email';
import AuthenticatedLayout from '@/platform/layouts/authenticated';

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

        if (new URL(request.url).pathname === '/api/v1/me') {
            return Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

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
                <AccountProvider>
                    <Brand>
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </Brand>
                </AccountProvider>
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
                expect(sessionStorage.getItem(storageKey)).toBeNull();
                expect(output.querySelector('input[name="password"]')).not.toBeNull();
                expect(output.querySelector('button[type="submit"]')?.textContent).toBe('Create account');
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'POST /api/v1/auth/verify'
                ]);
                expect(errors).toEqual([]);

                const events = userEvent.setup();

                for (const name of ['name', 'password']) {
                    const input = output.querySelector<HTMLInputElement>(`input[name="${name}"]`);
                    const label = [...output.querySelectorAll('label')].find((label) => label.htmlFor === input?.id);

                    if (!input || !label) throw new Error(`Expected the ${name} field and label`);
                    expect(label.classList.contains('sr-only')).toBe(false);
                    await act(async () => events.click(label));
                    expect(document.activeElement).toBe(input);
                }
                expect(requests).toHaveLength(1);
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

it('retains pending proof when verification is canceled by unmounting', async () => {
    // Arrange a delayed exchange with proof recovered from storage.
    const storageKey = 'longlink.registration.token';
    sessionStorage.setItem(storageKey, 'pending-proof');
    let resolveVerification: (response: Response) => void = () => undefined;
    let verificationRequest: Request | undefined;

    const verificationResponse = new Promise<Response>((resolve) => {
        resolveVerification = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (new URL(request.url).pathname === '/api/v1/me') {
            return Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

        verificationRequest = request;

        return verificationResponse;
    });

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <AccountProvider>
                    <ApiBoundary>
                        <Page />
                    </ApiBoundary>
                </AccountProvider>
            </ApiErrorContext>,
            async (output) => {
                await vi.waitFor(() => expect(verificationRequest).toBeDefined());
                expect(sessionStorage.getItem(storageKey)).toBe('pending-proof');
                expect(output.querySelector('input[name="password"]')).toBeNull();
            },
            '/auth/verify-email'
        );

        // A late success cannot discard the canceled attempt's retry credential.
        expect(verificationRequest?.signal.aborted).toBe(true);
        await act(async () => resolveVerification(Response.json({ email: 'new@example.com' })));
        expect(sessionStorage.getItem(storageKey)).toBe('pending-proof');
    } finally {
        resolveVerification(Response.json({ email: 'new@example.com' }));
        transport.mockRestore();
        sessionStorage.removeItem(storageKey);
    }
});

it.each(['transport failure', 'invalid response'])('retains email proof for retry after %s', async (failure) => {
    // Arrange a recoverable failed exchange with no remaining URL credential.
    const storageKey = 'longlink.registration.token';
    const proofs: unknown[] = [];
    const errors: unknown[] = [];
    sessionStorage.setItem(storageKey, 'retry-proof');

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') return Response.json({ detail: 'Not authenticated' }, { status: 401 });

        if (path === '/api/v1/auth/register/setup' && proofs.length === 2) {
            return Response.json({ email: 'new@example.com' });
        }

        if (path === '/api/v1/auth/verify' && request.method === 'POST') {
            proofs.push(await request.json());

            if (proofs.length === 1) {
                return failure === 'transport failure'
                    ? Response.json({ detail: 'Unavailable' }, { status: 503 })
                    : Response.json({ email: 'not-an-email' });
            }

            return Response.json({ email: 'new@example.com' });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountProvider>
                    <ApiBoundary>
                        <Page />
                    </ApiBoundary>
                </AccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // A failed exchange must retain proof without admitting credential entry.
                await act(async () => {
                    await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page.'));
                });
                expect(sessionStorage.getItem(storageKey)).toBe('retry-proof');
                expect(output.querySelector('input[name="password"]')).toBeNull();
                const retry = output.querySelector('button');

                if (!retry) throw new Error('Expected verification retry');

                // Retry remounts verification with the retained bearer.
                await act(async () => userEvent.setup().click(retry));
                await act(async () => {
                    await vi.waitFor(() => expect(output.querySelector('input[name="name"]')).not.toBeNull());
                });
                expect(proofs).toEqual([{ token: 'retry-proof' }, { token: 'retry-proof' }]);
                expect(sessionStorage.getItem(storageKey)).toBeNull();
                expect(errors).toHaveLength(1);
            },
            '/auth/verify-email'
        );
    } finally {
        transport.mockRestore();
        sessionStorage.removeItem(storageKey);
    }
});

it.each([400, 409])('recovers from completion status %s without publishing an account', async (status) => {
    // Arrange valid admission followed by an expired setup or an account-creation race.
    const credentials: unknown[] = [];
    let setupRequests = 0;
    let identityRequests = 0;

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') {
            identityRequests += 1;

            return Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

        if (path === '/api/v1/auth/register/setup') {
            setupRequests += 1;

            return setupRequests === 1
                ? Response.json({ email: 'new@example.com' })
                : Response.json({ detail: 'Expired setup' }, { status: 400 });
        }

        if (path === '/api/v1/auth/register/complete' && request.method === 'POST') {
            credentials.push(await request.json());

            return Response.json({ detail: 'Cannot complete registration' }, { status });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route path="/auth/verify-email" element={<Page />} />
                    <Route path="/user/organizations" element={<p>Unexpected account navigation</p>} />
                </Route>
            </Routes>,
            async (output) => {
                await act(async () => {
                    await vi.waitFor(() => expect(output.querySelector('input[name="name"]')).not.toBeNull());
                });
                const name = output.querySelector<HTMLInputElement>('input[name="name"]');
                const password = output.querySelector<HTMLInputElement>('input[name="password"]');
                const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');
                const events = userEvent.setup();
                const initialIdentityRequests = identityRequests;

                if (!name || !password || !submit) throw new Error('Expected verified account form');

                // Submit valid account details so only the completion boundary rejects them.
                await act(async () => {
                    await events.type(name, 'New Owner');
                    await events.type(password, 'Strong-password-123');
                    await events.click(submit);
                });

                // Recovery must not refresh identity or navigate as if registration succeeded.
                await act(async () => {
                    await vi.waitFor(() =>
                        expect(output.querySelector('a[href^="/auth/register"]')?.textContent).toBe(
                            'Request a new registration link'
                        )
                    );
                });
                const recovery = output.querySelector<HTMLAnchorElement>('a[href^="/auth/register"]');

                expect(recovery?.getAttribute('href')).toBe(
                    status === 409 ? '/auth/register?email=new%40example.com' : '/auth/register'
                );
                expect(credentials).toEqual([{ name: 'New Owner', password: 'Strong-password-123' }]);
                expect(identityRequests).toBe(initialIdentityRequests);
                expect(output.querySelector('input[name="password"]')).toBeNull();
                expect(output.textContent).not.toContain('Unexpected account navigation');
            },
            '/auth/verify-email'
        );
    } finally {
        transport.mockRestore();
        localStorage.removeItem('longlink:appearance');
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

        if (new URL(request.url).pathname === '/api/v1/me') {
            return Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

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
                <AccountProvider>
                    <Brand>
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </Brand>
                </AccountProvider>
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
                    'POST /api/v1/auth/verify'
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

it('discards exchanged proof and recovers setup on remount before completing registration', async () => {
    // Arrange an exchange that establishes server-owned setup for an anonymous session.
    const storageKey = 'longlink.registration.token';
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    let verified = false;
    let registered = false;
    const admissionRequests: string[] = [];
    const credentials: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') {
            return registered ? Response.json(user) : Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

        if (path === '/api/v1/auth/verify' && request.method === 'POST') {
            admissionRequests.push(path);
            expect(await request.json()).toEqual({ token: 'registration-proof' });
            verified = true;

            return Response.json({ email: user.email });
        }

        if (path === '/api/v1/auth/register/setup') {
            admissionRequests.push(path);

            return verified
                ? Response.json({ email: user.email })
                : Response.json({ detail: 'Missing setup cookie' }, { status: 400 });
        }

        if (path === '/api/v1/auth/register/complete' && request.method === 'POST') {
            credentials.push(await request.json());
            registered = true;

            return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        // Exchange once, then leave before submitting any account credentials.
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route path="/auth/verify-email" element={<Page />} />
                </Route>
            </Routes>,
            async (output) => {
                await act(async () => {
                    await vi.waitFor(() => expect(output.querySelector('input[name="name"]')).not.toBeNull());
                });
                expect(sessionStorage.getItem(storageKey)).toBeNull();
                expect(credentials).toEqual([]);
                expect(admissionRequests).toEqual(['/api/v1/auth/verify']);
            },
            '/auth/verify-email#token=registration-proof'
        );

        // Recover without the fragment or a stored bearer, using only server-owned setup.
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route path="/auth/verify-email" element={<Page />} />
                    <Route element={<AuthenticatedLayout />}>
                        <Route path="/user/organizations" element={<p>Registered account organizations</p>} />
                    </Route>
                    <Route path="/login" element={<p>Unexpected sign-in prompt</p>} />
                </Route>
            </Routes>,
            async (output) => {
                await act(async () => {
                    await vi.waitFor(() => expect(output.querySelector('input[name="name"]')).not.toBeNull());
                });
                const name = output.querySelector<HTMLInputElement>('input[name="name"]');
                const password = output.querySelector<HTMLInputElement>('input[name="password"]');
                const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');
                const events = userEvent.setup();

                if (!name || !password || !submit) throw new Error('Expected verified account credentials');

                // Finish account creation without remounting the identity provider.
                await act(async () => {
                    await events.type(name, 'New Owner');
                    await events.type(password, 'Strong-password-123');
                    await events.click(submit);
                });

                await act(async () => {
                    await vi.waitFor(() => expect(output.textContent).toContain('Registered account organizations'));
                });
                expect(output.textContent).not.toContain('Unexpected sign-in prompt');
                expect(credentials).toEqual([{ name: 'New Owner', password: 'Strong-password-123' }]);
                expect(output.textContent).not.toContain('Unable to load');
                expect(admissionRequests).toEqual(['/api/v1/auth/verify', '/api/v1/auth/register/setup']);
            },
            '/auth/verify-email'
        );
    } finally {
        transport.mockRestore();
        window.history.replaceState(originalState, '', originalUrl);
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem('longlink:appearance');
    }
});
