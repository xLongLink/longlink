// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Layout from '@/platform/layouts/admin';
import { renderPlatform, user } from '../render';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';

it('does not reveal administrator navigation to a regular Platform user', () => {
    // Act
    const output = renderPlatform(<Layout />, '/admin/users');

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe("We can't find that page");
    expect(output.querySelector('a[href="/admin/compute"]')).toBeNull();
    expect(output.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
});

it('retains the administrator breadcrumb and navigation for an authorized user', () => {
    const output = renderPlatform(
        <AuthenticatedUserContext value={{ ...user, administrator: true }}>
            <Layout />
        </AuthenticatedUserContext>,
        '/admin/users'
    );

    expect(output.querySelector('nav[aria-label="Breadcrumb"] > ol > li [aria-current="page"]')?.textContent).toBe(
        'Admin'
    );
    expect(output.querySelector('a[href="/admin/compute"]')?.textContent).toContain('Compute');
    expect(output.querySelector('h1')?.textContent).not.toBe("We can't find that page");
});
