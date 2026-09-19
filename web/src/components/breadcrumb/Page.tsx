import { useLocation } from 'react-router';
import { startCase } from 'es-toolkit/compat';
import { Wordmark } from '@/components/Wordmark';
import { decodePathSegment } from '@/components/breadcrumb/text';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders the top navigation breadcrumb for organization and admin routes. */
export function PageBreadcrumb({ solutionName }: { solutionName?: string }) {
    const { pathname } = useLocation();
    const organization = pathname.split('/')[2] ?? '';
    const label = pathname.startsWith('/admin/') ? 'Admin' : startCase(decodePathSegment(organization));
    const isSolutionBreadcrumb = solutionName !== undefined;
    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem href="/user/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem
                href={isSolutionBreadcrumb ? `/orgs/${organization}` : undefined}
                isCurrent={!isSolutionBreadcrumb}
            >
                {label}
            </BreadcrumbItem>
            {isSolutionBreadcrumb && <BreadcrumbItem isCurrent>{solutionName}</BreadcrumbItem>}
        </Breadcrumbs>
    );
}
