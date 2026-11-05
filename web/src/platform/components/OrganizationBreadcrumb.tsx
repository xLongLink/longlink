import { useContext } from 'react';
import { useParams } from 'react-router';
import { SidebarContext } from '@/lib/sidebar';
import { buildBreadcrumbs } from '@/components/breadcrumb/text';
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

    // Append only the View path, keeping organization and Solution UUIDs out of labels.
    const { solution, '*': path = '' } = useParams();
    const solutionHref = `/orgs/${organization.id}/solutions/${solution}`;
    const items = solutionName !== undefined && solution ? buildBreadcrumbs(path) : [];

    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem
                href={sidebar !== null ? `/orgs/${organization.id}` : undefined}
                isCurrent={solutionName === undefined}
            >
                {sidebar !== null ? name : <OrganizationSwitcher organization={organization} />}
            </BreadcrumbItem>
            {solutionName !== undefined && (
                <BreadcrumbItem href={items.length > 0 ? solutionHref : undefined} isCurrent={items.length === 0}>
                    {solutionName}
                </BreadcrumbItem>
            )}
            {items.map(({ label, href }, index) => {
                const isLast = index === items.length - 1;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : `${solutionHref}${href}`} isCurrent={isLast}>
                        {label}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
