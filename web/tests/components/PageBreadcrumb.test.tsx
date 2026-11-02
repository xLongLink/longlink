// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { renderPlatform, membership } from '../platform/render';

it('uses the resolved Solution name rather than its slug for the current breadcrumb', () => {
    // Act
    const output = renderPlatform(
        <PageBreadcrumb solutionName="Order dashboard" />,
        `/orgs/${membership.organization.id}/solutions/00000000-0000-4000-8000-000000000003`
    );

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Order dashboard');
    expect(output.textContent).toContain('Acme');
    expect(output.querySelector('button')).toBeNull();
});
