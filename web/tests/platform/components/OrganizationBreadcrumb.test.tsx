// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { SidebarContext } from '@/lib/sidebar';
import { renderPlatform, membership } from '../render';
import { OrganizationBreadcrumb } from '@/platform/components/OrganizationBreadcrumb';

it('uses the resolved Solution name rather than its slug for the current breadcrumb', () => {
    // Act
    const output = renderPlatform(
        <SidebarContext value="expanded">
            <OrganizationBreadcrumb organization={membership.organization} solutionName="Order dashboard" />
        </SidebarContext>,
        `/orgs/${membership.organization.id}/solutions/00000000-0000-4000-8000-000000000003`,
        [],
        '/orgs/:organization/solutions/:solution/*'
    );

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Order dashboard');
    expect(output.textContent).toContain('Acme');
    expect(output.querySelector('button')).toBeNull();
    expect(output.textContent).not.toContain(membership.organization.id);
    expect(output.textContent).not.toContain('00000000-0000-4000-8000-000000000003');
});

it('appends only the View path and keeps every ancestor within the resolved organization and Solution', () => {
    const solution = '00000000-0000-4000-8000-000000000003';
    const base = `/orgs/${membership.organization.id}/solutions/${solution}`;

    // Resolve real route parameters rather than showing identifier path segments as labels.
    const output = renderPlatform(
        <OrganizationBreadcrumb organization={membership.organization} solutionName="Order dashboard" />,
        `${base}/customer-orders/pending%20review`,
        [],
        '/orgs/:organization/solutions/:solution/*'
    );

    expect(output.querySelector(`a[href="/orgs/${membership.organization.id}"]`)?.textContent).toBe('Acme');
    expect(output.querySelector(`a[href="${base}"]`)?.textContent).toBe('Order dashboard');
    expect(output.querySelector(`a[href="${base}/customer-orders/"]`)?.textContent).toBe('Customer Orders');
    expect(output.querySelector('[aria-current="page"]')?.textContent).toBe('Pending Review');
    expect(output.querySelector(`a[href="${base}/customer-orders/pending%20review/"]`)).toBeNull();
    expect(output.textContent).not.toContain(membership.organization.id);
    expect(output.textContent).not.toContain(solution);
});
