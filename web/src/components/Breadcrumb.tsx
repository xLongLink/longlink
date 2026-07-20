import startCase from 'lodash/startCase';
import { useLocation } from 'react-router';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Wordmark } from '@/components/Wordmark';

type BreadcrumbTrailItem = {
    href: string;
    label: string;
};

const hiddenSegments = new Set(['orgs', 'apps']);

/** Decodes one URL path segment without failing breadcrumb rendering. */
function decodeSegment(segment: string): string {
    // Decode readable labels when possible.
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/** Builds breadcrumbs for organization and application routes. */
function buildOrganizationCrumbs(segments: string[]): BreadcrumbTrailItem[] {
    const organization = segments[1] ?? '';
    const application = segments[2] === 'apps' ? segments[3] : null;
    const organizationCrumb: BreadcrumbTrailItem = {
        label: startCase(decodeSegment(organization)),
        href: `/orgs/${organization}`,
    };

    // Keep organization routes to a single crumb.
    if (!application) {
        return [organizationCrumb];
    }

    return [
        organizationCrumb,
        {
            label: startCase(decodeSegment(application)),
            href: `/orgs/${organization}/apps/${application}`,
        },
    ];
}

/** Builds generic breadcrumbs by hiding routing-only path segments. */
function buildDefaultCrumbs(segments: string[]): BreadcrumbTrailItem[] {
    return segments.flatMap((segment, index) => {
        // Drop routing-only segments from default trails.
        if (hiddenSegments.has(segment)) {
            return [];
        }

        return [
            {
                label: startCase(decodeSegment(segment)),
                href: `/${segments.slice(0, index + 1).join('/')}`,
            },
        ];
    });
}

/** Renders the top navigation breadcrumb for organization, app, and profile routes. */
export function Breadcrumb() {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);
    const isAdminSection = segments[0] === 'admin';
    const isOrganizationSection = segments[0] === 'orgs' && segments.length >= 2;
    const crumbs = isAdminSection
        ? [{ href: '/admin/users', label: 'Admin' }]
        : isOrganizationSection
          ? buildOrganizationCrumbs(segments)
          : buildDefaultCrumbs(segments);

    return (
        <Breadcrumbs
            className="[&_li]:text-[0.875rem] [&_li]:leading-5"
            separator={<span className="px-1">{'>'}</span>}
            variant="supporting"
        >
            <BreadcrumbItem href="/organizations">
                <Wordmark />
            </BreadcrumbItem>
            {crumbs.map((crumb) => (
                <BreadcrumbItem key={crumb.href} href={crumb.href}>
                    {crumb.label}
                </BreadcrumbItem>
            ))}
        </Breadcrumbs>
    );
}
