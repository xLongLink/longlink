// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import routes from '@/platform/routes';
import { it, expect, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import { ApiErrorContext } from '@/lib/errors';
import Page from '@/platform/routes/auth/Login';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';

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
            { path: 'auth/reset-password', file: './routes/auth/ResetPassword.tsx' },
        ],
    });
});

it('reports a wrong password without losing the form and allows a successful retry', async () => {
    // Arrange
    const errors: unknown[] = [];
    const attempts: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (path === '/api/v1/me') return Response.json({ detail: 'Not authenticated' }, { status: 401 });

        if (path === '/api/v1/auth/oauth') return Response.json({ google: false, github: false });

        if (path === '/api/v1/auth/password/login' && request.method === 'POST') {
            attempts.push(await request.json());

            return attempts.length === 1
                ? Response.json({ detail: 'Invalid email or password.' }, { status: 400 })
                : new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <ApiBoundary>
                    <Routes>
                        <Route path="/login" element={<Page />} />
                        <Route path="/user/organizations" element={<p>Organizations</p>} />
                    </Routes>
                </ApiBoundary>
            </ApiErrorContext>,
            async (output) => {
                // Submit valid form values with an incorrect password.
                const events = userEvent.setup();
                const password = output.querySelector<HTMLInputElement>('input[name="password"]');
                const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');

                if (!password || !submit) throw new Error('Expected the sign-in form');

                await act(async () => {
                    await events.type(password, 'Wrong-password-123');
                    await events.click(submit);
                });

                // Keep the editable form in place and report the backend message once.
                await vi.waitFor(() => expect(errors).toHaveLength(1));
                expect(errors).toEqual([
                    expect.objectContaining({ status: 400, message: 'Invalid email or password.' }),
                ]);
                expect(output.textContent).not.toContain('Unable to load this page.');
                expect(output.querySelector('input[name="password"]')).toBe(password);
                expect(output.querySelector<HTMLInputElement>('input[name="email"]')?.value).toBe('owner@example.com');

                // Retry with a corrected password and reach the signed-in destination.
                await act(async () => {
                    await events.clear(password);
                    await events.type(password, 'Correct-password-123');
                    await events.click(submit);
                });
                await vi.waitFor(() => expect(output.textContent).toContain('Organizations'));
                expect(attempts).toEqual([
                    { email: 'owner@example.com', password: 'Wrong-password-123' },
                    { email: 'owner@example.com', password: 'Correct-password-123' },
                ]);
                expect(errors).toHaveLength(1);
            },
            '/login?email=owner%40example.com'
        );
    } finally {
        transport.mockRestore();
    }
});
