// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../render';
import { AuthLayout } from '@/platform/routes/auth/auth-layout';

it('does not invent description content for explicitly empty authentication layouts', () => {
    // Act
    const output = renderStatic(
        <AuthLayout title="Sign in" description={null}>
            Credentials
        </AuthLayout>
    );

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Sign in');
    expect(output.querySelector('p')).toBeNull();
    expect(output.textContent).toContain('Credentials');
});

it('keeps authored account completion descriptions outside plain-text typography', () => {
    // Arrange an authored description like the account completion divider.
    const output = renderStatic(
        <AuthLayout title="Complete your account" description={<p className="authored-description">Email verified.</p>}>
            Profile fields
        </AuthLayout>
    );

    // Assert authored presentation is not replaced or nested inside another paragraph.
    expect(output.querySelectorAll('p')).toHaveLength(1);
    expect(output.querySelector('p')?.className).toBe('authored-description');
    expect(output.textContent).toContain('Profile fields');
});

it('keeps an empty string description present without coercing authored content', () => {
    // Act
    const output = renderStatic(
        <AuthLayout title="Sign in" description="">
            Credentials
        </AuthLayout>
    );

    // Assert the empty string remains a plain-text paragraph, unlike null.
    expect(output.querySelectorAll('p')).toHaveLength(1);
    expect(output.querySelector('p')?.textContent).toBe('');
});
