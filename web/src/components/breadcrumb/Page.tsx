import { startCase } from '@/lib/utils';
import { useLocation } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders the top navigation breadcrumb for organization and admin routes. */
export function PageBreadcrumb({ applicationName }: { applicationName?: string }) {
    const { pathname } = useLocation();
    const organization = pathname.split('/')[2] ?? '';
    const label = pathname.startsWith('/admin/') ? 'Admin' : startCase(decodeURIComponent(organization));
    const hasApplicationName = applicationName !== undefined;

    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem href="/user/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem
                href={hasApplicationName ? `/orgs/${organization}` : undefined}
                isCurrent={!hasApplicationName}
            >
                {label}
            </BreadcrumbItem>
            {hasApplicationName ? <BreadcrumbItem isCurrent>{applicationName}</BreadcrumbItem> : null}
        </Breadcrumbs>
    );
}
