import startCase from 'lodash/startCase';
import { useLocation } from 'react-router';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Wordmark } from '@/components/Wordmark';

/** Renders the top navigation breadcrumb for organization and admin routes. */
export function PageBreadcrumb() {
    const { pathname } = useLocation();
    const organization = pathname.split('/')[2] ?? '';
    const label = pathname.startsWith('/admin/') ? 'Admin' : startCase(decodeURIComponent(organization));

    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem href="/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrent>{label}</BreadcrumbItem>
        </Breadcrumbs>
    );
}
