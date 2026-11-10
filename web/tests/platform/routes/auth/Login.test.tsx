// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import routes from '@/platform/routes';
import { renderPlatform } from '../../render';
import Page from '@/platform/routes/auth/Login';

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
