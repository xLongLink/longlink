// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Layout from '@/platform/layouts/admin';
import { renderPlatform, user } from '../render';

it('does not reveal administrator navigation to a regular Platform user', () => {
    // Act
    const output = renderPlatform(<Layout />, '/admin/users');

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe("We can't find that page");
    expect(output.querySelector('a[href="/admin/compute"]')).toBeNull();
    expect(output.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
});

it('shows administrator navigation to an authorized user', () => {
    const output = renderPlatform(<Layout />, '/admin/users', [['/api/v1/me', { ...user, administrator: true }]]);

    expect(output.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')).not.toBeNull();
    expect(output.querySelector('a[href="/admin/compute"]')).not.toBeNull();
});
