import { Fragment } from 'react';
import startCase from 'lodash/startCase';
import { Link, useLocation } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/components/ui/breadcrumb';

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

/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
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
        <UIBreadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <Link to="/organizations" aria-label="LongLink home" className="inline-flex items-center">
                        <Wordmark />
                    </Link>
                </BreadcrumbItem>
                {crumbs.length ? (
                    <BreadcrumbSeparator className="px-0.5 text-muted-foreground">&gt;</BreadcrumbSeparator>
                ) : null}
                {crumbs.map((crumb, index) => (
                    <Fragment key={crumb.href}>
                        {index > 0 ? (
                            <BreadcrumbSeparator className="px-0.5 text-muted-foreground">&gt;</BreadcrumbSeparator>
                        ) : null}
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={crumb.href}
                                        className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </UIBreadcrumb>
    );
}
