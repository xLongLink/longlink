import { useParams } from 'react-router';
import type { OrganizationIdentity } from '@/components/ui/organization-switcher';
import { Breadcrumbs, buildBreadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs';

/** Renders resolved organization identity for the actual navigation layout. */
export function OrganizationBreadcrumb({
    organization,
    solutionName
}: {
    organization: OrganizationIdentity;
    solutionName?: string;
}) {
    // Append only the View path, keeping organization and Solution UUIDs out of labels.
    const { solution, '*': path = '' } = useParams();
    const solutionHref = `/orgs/${organization.id}/solutions/${solution}`;
    const items: BreadcrumbItem[] = [{ label: organization.name ?? 'Organization', href: `/orgs/${organization.id}` }];

    // Include resolved Solution identity before its relative View path.
    if (solutionName !== undefined) {
        items.push({ label: solutionName, href: solutionHref });

        if (solution) {
            items.push(...buildBreadcrumbs(path).map(({ label, href }) => ({ label, href: `${solutionHref}${href}` })));
        }
    }

    return <Breadcrumbs items={items} />;
}
