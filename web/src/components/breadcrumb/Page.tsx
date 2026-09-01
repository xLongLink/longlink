import { useLocation } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import { decodePathSegment, startCase } from '@/lib/utils';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders the top navigation breadcrumb for organization and admin routes. */
export function PageBreadcrumb({ applicationName }: { applicationName?: string }) {
    const { pathname } = useLocation();
    const organization = pathname.split('/')[2] ?? '';
    const label = pathname.startsWith('/admin/') ? 'Admin' : startCase(decodePathSegment(organization));
    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem href="/user/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem
                href={applicationName !== undefined ? `/orgs/${organization}` : undefined}
                isCurrent={applicationName === undefined}
            >
                {label}
            </BreadcrumbItem>
            {applicationName !== undefined && <BreadcrumbItem isCurrent>{applicationName}</BreadcrumbItem>}
        </Breadcrumbs>
    );
}
