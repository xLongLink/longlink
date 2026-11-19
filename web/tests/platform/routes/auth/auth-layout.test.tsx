// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../render';
import { AuthLayout } from '@/platform/routes/auth/auth-layout';

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
