import { useContext } from 'react';
import { SidebarContext } from '@/lib/sidebar';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { OrganizationSwitcher, type OrganizationIdentity } from '@/platform/components/OrganizationSwitcher';

/** Renders resolved organization identity for the actual navigation layout. */
export function OrganizationBreadcrumb({
    organization,
    solutionName,
}: {
    organization: OrganizationIdentity;
    solutionName?: string;
}) {
    const sidebar = useContext(SidebarContext);
    const name = organization.name ?? 'Organization';

    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem
                href={sidebar !== null ? `/orgs/${organization.id}` : undefined}
                isCurrent={solutionName === undefined}
            >
                {sidebar !== null ? name : <OrganizationSwitcher organization={organization} />}
            </BreadcrumbItem>
            {solutionName !== undefined && <BreadcrumbItem isCurrent>{solutionName}</BreadcrumbItem>}
        </Breadcrumbs>
    );
}
