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
        `/orgs/${membership.organization.id}/solutions/00000000-0000-4000-8000-000000000003`
    );

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Order dashboard');
    expect(output.textContent).toContain('Acme');
    expect(output.querySelector('button')).toBeNull();
});
