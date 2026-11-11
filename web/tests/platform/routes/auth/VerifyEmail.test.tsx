// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { user } from '../../render';
import { it, expect, vi } from 'vitest';
import PlatformRoot from '@/platform/root';
import Brand from '@/platform/layouts/Brand';
import { Route, Routes } from 'react-router';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import Page from '@/platform/routes/auth/VerifyEmail';
import { ApiBoundary } from '@/components/ApiBoundary';
import AuthenticatedLayout from '@/platform/layouts/Authenticated';
import { AccountAppearanceProvider } from '@/components/Appearance';

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
                <AccountAppearanceProvider>
                    <Brand>
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </Brand>
                </AccountAppearanceProvider>
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
                <AccountAppearanceProvider>
                    <Brand>
                        <ApiBoundary>
                            <Page />
                        </ApiBoundary>
                    </Brand>
                </AccountAppearanceProvider>
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

it('refreshes the persistent identity after registration before entering a protected route', async () => {
    // Arrange verified setup for an anonymous session.
    let registered = false;
    const credentials: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') {
            return registered ? Response.json(user) : Response.json({ detail: 'Not authenticated' }, { status: 401 });
        }

        if (path === '/api/v1/auth/register/setup') return Response.json({ email: user.email });

        if (path === '/api/v1/auth/register/complete' && request.method === 'POST') {
            credentials.push(await request.json());
            registered = true;

            return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
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
            },
            '/auth/verify-email'
        );
    } finally {
        transport.mockRestore();
        localStorage.removeItem('longlink:appearance');
    }
});
