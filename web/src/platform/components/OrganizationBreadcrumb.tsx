import { useParams } from 'react-router';
import { buildBreadcrumbs } from '@/components/breadcrumb/text';
import { Breadcrumbs, BreadcrumbItem } from '@/components/breadcrumb/Breadcrumbs';
import type { OrganizationIdentity } from '@/platform/components/OrganizationSwitcher';

/** Renders resolved organization identity for the actual navigation layout. */
export function OrganizationBreadcrumb({
    organization,
    solutionName
}: {
    organization: OrganizationIdentity;
    solutionName?: string;
}) {
    const name = organization.name ?? 'Organization';

    // Append only the View path, keeping organization and Solution UUIDs out of labels.
    const { solution, '*': path = '' } = useParams();
    const solutionHref = `/orgs/${organization.id}/solutions/${solution}`;
    const items = solutionName !== undefined && solution ? buildBreadcrumbs(path) : [];

    return (
        <Breadcrumbs>
            <BreadcrumbItem href={`/orgs/${organization.id}`} isCurrent={solutionName === undefined}>
                {name}
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
