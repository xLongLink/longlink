// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import routes from '@/platform/routes';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import Page from '@/platform/routes/auth/Login';
import BrandLayout from '@/platform/layouts/Brand';
import { renderPlatform, user } from '../../render';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';
import AccountLayout from '@/platform/layouts/Account';
import McpAuthorization from '@/platform/routes/auth/Mcp';
import { Route, Routes, useLocation } from 'react-router';
import AuthenticatedLayout from '@/platform/layouts/Authenticated';
import { AccountAppearanceProvider } from '@/components/Appearance';

/** Exposes the actual router destination without replacing navigation. */
function LocationProbe() {
    const location = useLocation();

    return (
        <output>
            {location.pathname}
            {location.search}
        </output>
    );
}

it('keeps password entry masked and email drafts in their owned field', () => {
    // Act
    const output = renderPlatform(<Page />, '/login?email=owner%40example.com');

    // Assert
    expect(output.querySelector('input[name="email"]')?.getAttribute('value')).toBe('owner@example.com');
    expect(output.querySelector('input[name="password"]')?.getAttribute('type')).toBe('password');
});

it('routes login and password recovery through the same standalone layout', () => {
    // Assert
    expect(routes).toContainEqual({
        file: './layouts/Account.tsx',
        children: [
            { path: 'login', file: './routes/auth/Login.tsx' },
            { path: 'auth/register', file: './routes/auth/Register.tsx' },
            { path: 'auth/forgot-password', file: './routes/auth/ForgotPassword.tsx' },
            { path: 'auth/reset-password', file: './routes/auth/ResetPassword.tsx' }
        ]
    });
});

it.each([
    { returnTo: 'https://attacker.example/collect', destination: '/user/organizations', content: 'Organizations' },
    {
        returnTo: '/mcp/authorize?client_id=trusted&state=original',
        destination: '/mcp/authorize?client_id=trusted&state=original',
        content: 'Review client requests access to Review solution.'
    }
])(
    'keeps rejected drafts and retries to the permitted destination: $destination',
    async ({ returnTo, destination, content }) => {
        // Arrange
        const errors: unknown[] = [];
        const attempts: unknown[] = [];
        let signedIn = false;
        let identityReads = 0;
        const consentRequests: string[] = [];

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            const path = new URL(request.url).pathname;

            if (path === '/api/v1/me') {
                identityReads += 1;

                return signedIn ? Response.json(user) : Response.json({ detail: 'Not authenticated' }, { status: 401 });
            }

            if (path === '/api/v1/auth/oauth') return Response.json({ google: false, github: false });

            if (path === '/api/v1/mcp/consent' && request.method === 'GET') {
                consentRequests.push(request.url);

                return Response.json({
                    client_name: 'Review client',
                    solution_name: 'Review solution',
                    redirect_uri: 'https://client.example/callback'
                });
            }

            if (path === '/api/v1/auth/password/login' && request.method === 'POST') {
                attempts.push(await request.json());
                signedIn = attempts.length > 1;

                return attempts.length === 1
                    ? Response.json({ detail: 'Invalid email or password.' }, { status: 400 })
                    : new Response(null, { status: 204 });
            }

            throw new Error(`Unexpected request: ${request.method} ${path}`);
        });

        try {
            await withMounted(
                <ApiErrorContext value={(error) => errors.push(error)}>
                    <LocationProbe />
                    <AccountAppearanceProvider>
                        <ApiBoundary>
                            <Routes>
                                <Route element={<AccountLayout />}>
                                    <Route path="/login" element={<Page />} />
                                </Route>
                                <Route element={<BrandLayout />}>
                                    <Route path="/mcp/authorize" element={<McpAuthorization />} />
                                </Route>
                                <Route element={<AuthenticatedLayout />}>
                                    <Route path="/user/organizations" element={<p>Organizations</p>} />
                                </Route>
                            </Routes>
                        </ApiBoundary>
                    </AccountAppearanceProvider>
                </ApiErrorContext>,
                async (output) => {
                    // Submit valid form values with an incorrect password.
                    const events = userEvent.setup();
                    const password = output.querySelector<HTMLInputElement>('input[name="password"]');
                    const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');

                    if (!password || !submit) throw new Error('Expected the sign-in form');
                    const anonymousReads = identityReads;

                    await act(async () => {
                        await events.type(password, 'Wrong-password-123');
                    });

                    // Revealing and masking the draft must not submit or erase the credentials.
                    const reveal = output.querySelector<HTMLButtonElement>('button[aria-label="Show password"]');

                    if (!reveal) throw new Error('Expected password visibility control');

                    await act(async () => events.click(reveal));
                    expect(password.type).toBe('text');
                    expect(password.value).toBe('Wrong-password-123');
                    expect(reveal.getAttribute('aria-label')).toBe('Hide password');
                    expect(attempts).toEqual([]);

                    await act(async () => events.keyboard('{Enter}'));
                    expect(password.type).toBe('password');
                    expect(password.value).toBe('Wrong-password-123');
                    expect(reveal.getAttribute('aria-label')).toBe('Show password');
                    expect(attempts).toEqual([]);

                    await act(async () => {
                        await events.click(submit);
                    });

                    // Keep the editable form in place and report the backend message once.
                    await vi.waitFor(() => expect(errors).toHaveLength(1));
                    expect(errors).toEqual([
                        expect.objectContaining({ status: 400, message: 'Invalid email or password.' })
                    ]);
                    expect(output.textContent).not.toContain('Unable to load this page.');
                    expect(output.querySelector('input[name="password"]')).toBe(password);
                    expect(output.querySelector<HTMLInputElement>('input[name="email"]')?.value).toBe(
                        'owner@example.com'
                    );
                    expect(password.value).toBe('Wrong-password-123');
                    expect(identityReads).toBe(anonymousReads);
                    expect(consentRequests).toEqual([]);
                    expect(output.textContent).not.toContain('Organizations');
                    expect(output.textContent).not.toContain('MCP approval');

                    // Retry with a corrected password and reach the signed-in destination.
                    await act(async () => {
                        await events.clear(password);
                        await events.type(password, 'Correct-password-123');
                        await events.click(submit);
                    });
                    await vi.waitFor(() => expect(output.textContent).toContain(content));
                    expect(output.querySelector('output')?.textContent).toBe(destination);
                    expect(consentRequests).toEqual(
                        destination.startsWith('/mcp/authorize?')
                            ? ['http://localhost/api/v1/mcp/consent?client_id=trusted&state=original']
                            : []
                    );
                    expect(identityReads).toBeGreaterThan(anonymousReads);
                    expect(attempts).toEqual([
                        { email: 'owner@example.com', password: 'Wrong-password-123' },
                        { email: 'owner@example.com', password: 'Correct-password-123' }
                    ]);
                    expect(errors).toHaveLength(1);
                },
                `/login?${new URLSearchParams({ email: 'owner@example.com', return_to: returnTo })}`
            );
        } finally {
            transport.mockRestore();
        }
    }
);

it('retains the complete MCP approval query when the persistent identity is already authenticated', async () => {
    // Resolve the real identity observer before the sign-in page redirects.
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') return Response.json(user);

        if (path === '/api/v1/auth/oauth') return Response.json({ google: false, github: false });

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    const destination = '/mcp/authorize?client_id=trusted&state=original';

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <LocationProbe />
                <AccountAppearanceProvider>
                    <ApiBoundary>
                        <Routes>
                            <Route path="/login" element={<Page />} />
                            <Route path="/mcp/authorize" element={<p>MCP approval</p>} />
                        </Routes>
                    </ApiBoundary>
                </AccountAppearanceProvider>
            </ApiErrorContext>,
            async (output) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.querySelector('output')?.textContent).toBe(destination);
                });
                expect(output.querySelector('form')).toBeNull();
            },
            `/login?${new URLSearchParams({ return_to: destination })}`
        );
    } finally {
        transport.mockRestore();
    }
});

it('carries the trimmed live email draft through SPA registration navigation', async () => {
    // Serve anonymous identity and provider availability through the application transport.
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') return Response.json({ detail: 'Not authenticated' }, { status: 401 });

        if (path === '/api/v1/auth/oauth') return Response.json({ google: false, github: false });

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <AccountAppearanceProvider>
                    <ApiBoundary>
                        <Routes>
                            <Route path="/login" element={<Page />} />
                            <Route path="/auth/register" element={<p>Registration destination</p>} />
                            <Route path="/auth/forgot-password" element={<p>Recovery destination</p>} />
                        </Routes>
                    </ApiBoundary>
                </AccountAppearanceProvider>
            </ApiErrorContext>,
            async (output) => {
                // Editing email updates only the registration handoff, without submitting credentials.
                const events = userEvent.setup();
                const email = output.querySelector<HTMLInputElement>('input[name="email"]');

                if (!email) throw new Error('Expected email field');

                await act(async () => events.type(email, '  next+draft@example.com  '));
                const register = output.querySelector<HTMLAnchorElement>('a[href^="/auth/register"]');
                const recovery = output.querySelector<HTMLAnchorElement>('a[href="/auth/forgot-password"]');

                if (!register || !recovery) throw new Error('Expected account flow links');

                expect(register.getAttribute('href')).toBe('/auth/register?email=next%2Bdraft%40example.com');
                expect(email.value).toBe('next+draft@example.com');
                await act(async () => events.click(register));
                expect(output.textContent).toContain('Registration destination');
                expect(output.querySelector('form')).toBeNull();
            },
            '/login'
        );
    } finally {
        transport.mockRestore();
    }
});

it('uses document navigation for enabled OAuth providers without submitting password drafts', async () => {
    // Keep the real provider query and identity observer; replace only external document navigation and HTTP.
    const errors: unknown[] = [];
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') return Response.json({ detail: 'Not authenticated' }, { status: 401 });

        if (path === '/api/v1/auth/oauth') return Response.json({ google: true, github: false });

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    const destination = '/mcp/authorize?client_id=trusted&state=original';

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountAppearanceProvider>
                    <ApiBoundary>
                        <Page />
                    </ApiBoundary>
                </AccountAppearanceProvider>
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                const password = output.querySelector<HTMLInputElement>('input[name="password"]');

                if (!password) throw new Error('Expected password field');

                await act(async () => events.type(password, 'Retained-password-123'));

                const google = [...output.querySelectorAll('button')].find(
                    (button) => button.textContent === 'Continue with Google'
                );

                if (!google) throw new Error('Expected enabled Google provider');

                expect(output.textContent).not.toContain('Continue with GitHub');
                await act(async () => events.click(google));
                expect(assign).toHaveBeenCalledExactlyOnceWith(
                    `/api/v1/auth/oauth/google?${new URLSearchParams({ return_to: destination })}`
                );
                expect(password.value).toBe('Retained-password-123');
                expect(errors).toEqual([
                    expect.objectContaining({
                        status: 400,
                        message: 'Unable to sign in with this provider. Please try again.'
                    })
                ]);
            },
            `/login?${new URLSearchParams({ oauth_error: '1', return_to: destination })}`
        );
    } finally {
        transport.mockRestore();
        assign.mockRestore();
    }
});
